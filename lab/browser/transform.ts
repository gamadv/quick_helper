// Turns a playground file into a browser module (runs in the service worker): TypeScript/JSX are
// compiled with sucrase, and import specifiers are rewritten to URLs the browser can load.
import { init, parse } from 'es-module-lexer/js'
import { transform, type Transform } from 'sucrase'
import { encodePath, NODE_SHIMS, REACT_MODULES, RUNTIME, VFS } from './paths.ts'

/** Files served as JavaScript modules. */
export const SCRIPT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

const NODE_BUILTINS = new Set(
  `assert assert/strict async_hooks buffer child_process cluster console constants crypto dgram
  diagnostics_channel dns dns/promises domain events fs fs/promises http http2 https inspector
  module net os path path/posix path/win32 perf_hooks process punycode querystring readline
  readline/promises repl sqlite stream stream/consumers stream/promises stream/web string_decoder
  sys test timers timers/promises tls trace_events tty url util util/types v8 vm wasi
  worker_threads zlib`.split(/\s+/),
)

// Vite-like resolution for pages and sandboxes; node/ follows Node and needs the exact file.
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']

export const lexerReady = init

/** TypeScript/JSX -> JavaScript. sucrase keeps line numbers, so stack traces point at the source. */
export function compile(file: string, source: string) {
  const transforms: Transform[] = []
  if (/\.[mc]?tsx?$/.test(file)) transforms.push('typescript')
  if (/\.[jt]sx$/.test(file)) transforms.push('jsx')
  if (transforms.length === 0) return source
  return transform(source, {
    transforms,
    filePath: file,
    jsxRuntime: 'automatic',
    production: true,
    disableESTransforms: true,
  }).code
}

/** "react/a/b.tsx" + "../c" -> "react/c"; undefined if it climbs above the lab root. */
function join(importer: string, relative: string) {
  const parts = importer.split('/').slice(0, -1)
  for (const segment of relative.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (!parts.pop()) return undefined
    } else {
      parts.push(segment)
    }
  }
  return parts.join('/')
}

function findFile(
  target: string,
  files: ReadonlySet<string>,
  exact: boolean,
): string | undefined {
  if (files.has(target)) return target
  if (exact) return undefined
  // TypeScript style: "./util.js" may name util.ts or util.tsx.
  const js = /\.(m?)js(x?)$/.exec(target)
  for (const candidate of js
    ? [`.${js[1]}ts${js[2]}`, `.${js[1]}tsx`].map(
        (ext) => target.slice(0, js.index) + ext,
      )
    : []) {
    if (files.has(candidate)) return candidate
  }
  for (const candidate of [
    ...EXTENSIONS.map((ext) => target + ext),
    ...EXTENSIONS.map((ext) => `${target}/index${ext}`),
  ]) {
    if (files.has(candidate)) return candidate
  }
  return undefined
}

/** The URL an import specifier of `importer` loads in the browser. */
export function resolveImport(
  specifier: string,
  importer: string,
  files: ReadonlySet<string>,
) {
  if (/^(https?|data|blob):/.test(specifier)) return specifier

  if (/^\.{0,2}\//.test(specifier)) {
    const path = specifier.replace(/[?#].*$/, '')
    const target = path.startsWith('/') ? path.slice(1) : join(importer, path)
    const found =
      target !== undefined &&
      findFile(target, files, importer.startsWith('node/'))
    if (!found) {
      return `${VFS}__missing.js?${new URLSearchParams({ specifier, importer })}`
    }
    // CSS, JSON, images...: served as a small JS module (see the service worker).
    return VFS + encodePath(found) + (SCRIPT.test(found) ? '' : '?module')
  }

  const builtin = specifier.replace(/^node:/, '')
  if (specifier.startsWith('node:') || NODE_BUILTINS.has(builtin)) {
    const shim = NODE_SHIMS[builtin]
    if (shim) return `${RUNTIME}node/${shim}.js`
    const query = new URLSearchParams({ module: builtin, importer })
    return `${VFS}__unsupported.js?${query}`
  }

  const react = REACT_MODULES[specifier]
  if (react) return `${RUNTIME}${react}.js`

  // Any other package comes from esm.sh. Pages and sandboxes keep React external, so a package
  // built on React uses the sandbox's copy (resolved by the import map the service worker adds).
  return importer.startsWith('node/')
    ? `https://esm.sh/${specifier}`
    : `https://esm.sh/${specifier}?external=react,react-dom`
}

export type ModuleError = {
  name: 'Error' | 'SyntaxError'
  /** First line of the stack, e.g. "Error [ERR_MODULE_NOT_FOUND]" (defaults to the name). */
  header?: string
  message: string
  /** Where it happened, shown as the stack's only frame. */
  at: string
}

/** A statement throwing `error`, with a Node-like stack instead of the generated module's. */
export function throwStatement({
  name,
  header = name,
  message,
  at,
}: ModuleError) {
  const stack = `${header}: ${message}\n    at ${at}`
  return `throw Object.assign(new ${name}(${JSON.stringify(message)}), { stack: ${JSON.stringify(stack)} });`
}

/** The error behind a URL that resolveImport gives to a missing or unsupported module. */
export function importFailure(url: string): ModuleError | undefined {
  const [path, query] = url.split('?')
  const params = new URLSearchParams(query)
  const importer = params.get('importer') ?? ''
  if (path === `${VFS}__missing.js`) {
    return {
      name: 'Error',
      header: 'Error [ERR_MODULE_NOT_FOUND]',
      message: `Cannot find module '${params.get('specifier')}' imported from ${importer}`,
      at: importer,
    }
  }
  if (path === `${VFS}__unsupported.js`) {
    return {
      name: 'Error',
      message: `O módulo node:${params.get('module')} não está disponível no modo navegador. Rode o lab com npm run dev para usar o Node de verdade.`,
      at: importer,
    }
  }
  return undefined
}

const blank = (text: string) => text.replace(/[^\n]/g, ' ')

/** Rewrites every static and literal dynamic import of `code` (already JavaScript). */
export function rewriteImports(
  code: string,
  importer: string,
  files: ReadonlySet<string>,
) {
  const [imports] = parse(code)
  let output = ''
  let last = 0
  let failure: ModuleError | undefined
  for (const entry of [...imports].sort((a, b) => a.start - b.start)) {
    if (entry.type === 'import-meta') continue
    if (
      entry.type === 'dynamic' &&
      (entry.specifier === undefined || entry.glob)
    )
      continue
    const url = resolveImport(entry.specifier!, importer, files)
    if (url === entry.specifier) continue
    // A static import that can't load would fail while linking, with a vague error ("does not
    // provide an export named..."). Drop it and throw a clear error when the module runs.
    const problem = entry.type === 'dynamic' ? undefined : importFailure(url)
    if (problem) {
      failure ??= problem
      output +=
        code.slice(last, entry.importStart) +
        blank(code.slice(entry.importStart, entry.importEnd))
      last = entry.importEnd
      continue
    }
    // Static specifiers exclude their quotes; dynamic ones are the whole (quoted) argument.
    output +=
      code.slice(last, entry.start) +
      (entry.type === 'dynamic' ? JSON.stringify(url) : url)
    last = entry.end
  }
  output += code.slice(last)
  // On the first line, so line numbers don't move.
  return failure ? throwStatement(failure) + output : output
}
