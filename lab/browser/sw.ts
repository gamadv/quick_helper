// Service worker of the browser mode (built to /sw.js, scope /vfs/). Serves the playground files
// stored in IndexedDB as if they were on a server: pages get the console bridge and an import
// map, TS/TSX/JSX are compiled to JS and their imports rewritten (lab/browser/transform.ts).
import bridge from '../console-bridge.js?raw'
import { REACT_MODULES, RUNTIME, VFS, vfsUrl } from './paths.ts'
import {
  compile,
  importFailure,
  lexerReady,
  rewriteImports,
  SCRIPT,
  throwStatement,
} from './transform.ts'
import { listPaths, readFile } from './vfs.ts'

// Minimal service worker types (the project uses the DOM lib, which doesn't declare them).
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}
interface FetchEvent extends ExtendableEvent {
  readonly request: Request
  respondWith(response: Promise<Response>): void
}
declare const self: {
  readonly location: { readonly origin: string }
  skipWaiting(): Promise<void>
  readonly clients: { claim(): Promise<void> }
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEvent) => void,
  ): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
}

const IMPORT_MAP = JSON.stringify({
  imports: Object.fromEntries(
    Object.entries(REACT_MODULES).map(([specifier, name]) => [
      specifier,
      `${RUNTIME}${name}.js`,
    ]),
  ),
})

const TYPES: Record<string, string> = {
  css: 'text/css',
  html: 'text/html',
  js: 'text/javascript',
  json: 'application/json',
  md: 'text/markdown',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  xml: 'application/xml',
}

const respond = (body: string, type: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': `${type}; charset=utf-8`,
      'Cache-Control': 'no-store',
    },
  })
const js = (code: string) => respond(code, 'text/javascript')
const html = (page: string) => respond(page, 'text/html')

/** Adds the console bridge (and the React import map) at the top of a page's <head>. */
function injectHead(page: string) {
  const tags =
    `<script>${bridge}</script>` +
    (/type=["']?importmap/i.test(page)
      ? ''
      : `<script type="importmap">${IMPORT_MAP}</script>`)
  const anchor =
    /<head\b[^>]*>/i.exec(page) ?? /^\s*<!doctype[^>]*>/i.exec(page)
  if (!anchor) return tags + page
  const end = anchor.index + anchor[0].length
  return page.slice(0, end) + tags + page.slice(end)
}

const reactHost = () =>
  injectHead(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React sandbox</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${RUNTIME}frame.js"></script>
  </body>
</html>
`)

// Hidden page that runs a node/ script: it starts the worker and relays its messages to the lab.
const NODE_RUNNER = `<!doctype html>
<meta charset="UTF-8" />
<script type="module">
  const post = (message) => parent.postMessage({ source: 'quick-lab-node', message }, location.origin)
  let worker
  addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== location.origin || worker) return
    worker = new Worker('${VFS}__node/worker.js', { type: 'module' })
    worker.onmessage = (e) => post(e.data)
    worker.onerror = (e) => {
      e.preventDefault()
      post({ type: 'stderr', data: (e.message || 'Não foi possível iniciar o worker do Node.') + '\\n' })
      post({ type: 'exit', code: 1, signal: null, ms: 0 })
    }
    worker.postMessage(event.data)
  })
  post({ type: 'ready' })
</script>
`

/** CSS, JSON and other files imported from JS: a module that applies or exports them. */
function assetModule(file: string, content: string) {
  if (file.endsWith('.css')) {
    return `const css = ${JSON.stringify(content)}
let style = [...document.head.querySelectorAll('style[data-lab-file]')].find((s) => s.dataset.labFile === ${JSON.stringify(file)})
if (!style) {
  style = document.createElement('style')
  style.dataset.labFile = ${JSON.stringify(file)}
  document.head.append(style)
}
style.textContent = css
export default css
`
  }
  if (file.endsWith('.json'))
    return `export default JSON.parse(${JSON.stringify(content)})\n`
  return `export default ${JSON.stringify(vfsUrl(file))}\n`
}

async function compileModule(file: string, source: string) {
  let code: string
  try {
    code = compile(file, source)
  } catch (err) {
    // sucrase: "Error transforming <file>: <message> (<line>:<column>)"
    const text = err instanceof Error ? err.message : String(err)
    const match = /^Error transforming .*?: (.*) \((\d+):(\d+)\)$/s.exec(text)
    return js(
      throwStatement({
        name: 'SyntaxError',
        message: match?.[1] ?? text,
        at: match ? `${file}:${match[2]}:${match[3]}` : file,
      }),
    )
  }
  await lexerReady()
  try {
    return js(rewriteImports(code, file, new Set(await listPaths())))
  } catch {
    // The lexer couldn't parse it: serve as is and let the browser report the syntax error.
    return js(code)
  }
}

async function handle(url: URL): Promise<Response> {
  const route = url.pathname.slice(VFS.length)
  const params = url.searchParams
  switch (route) {
    case '__frame/react.html':
      return html(reactHost())
    case '__node/runner.html':
      return html(NODE_RUNNER)
    case '__node/worker.js':
      return js(`import '${RUNTIME}node-worker.js'\n`)
    // Dynamic imports of a missing or unsupported module (static ones throw where imported).
    case '__missing.js':
    case '__unsupported.js':
      return js(throwStatement(importFailure(url.pathname + url.search)!))
  }

  let file: string
  try {
    file = route.split('/').map(decodeURIComponent).join('/')
  } catch {
    return respond('Caminho inválido', 'text/plain', 400)
  }
  const content = await readFile(file)
  if (content === undefined)
    return respond(`Arquivo não encontrado: ${file}`, 'text/plain', 404)
  if (params.has('module')) return js(assetModule(file, content))
  if (file.endsWith('.html')) return html(injectHead(content))
  if (SCRIPT.test(file)) return compileModule(file, content)
  const extension = file.slice(file.lastIndexOf('.') + 1).toLowerCase()
  return respond(content, TYPES[extension] ?? 'text/plain')
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(VFS) ||
    event.request.method !== 'GET'
  ) {
    return
  }
  event.respondWith(
    handle(url).catch((err: unknown) =>
      respond(String(err), 'text/plain', 500),
    ),
  )
})
