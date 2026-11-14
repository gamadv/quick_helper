// `vite build`: the static, browser-only lab (e.g. for Netlify). Besides the UI (index.html) it
// builds the modules that previews and the node worker load by URL (/runtime/*.js), the service
// worker (/sw.js) and two JSON assets: the editor's type definitions and the repo's files, which
// fill a visitor's browser on the first visit.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { build, type Plugin } from 'vite'
import {
  NODE_SHIMS,
  REACT_MODULES,
  RUNTIME,
  SEED_JSON,
  SERVICE_WORKER,
  TYPES_JSON,
  VFS,
} from './browser/paths.ts'
import { collectTypes, listFiles } from './files.ts'
import { SECTIONS } from './shared.ts'

const VIRTUAL_REACT = '\0lab-react:'
const RUNTIME_DIR = RUNTIME.slice(1) // "runtime/"
const MAX_SEED_FILE = 512 * 1024

/** Entry points with a stable URL (/runtime/<name>.js) instead of a hashed one. */
function runtimeEntries(root: string) {
  const entries: Record<string, string> = {
    frame: path.join(root, 'lab/frame/browser.tsx'),
    'node-worker': path.join(root, 'lab/browser/runtime/node-worker.ts'),
  }
  for (const [specifier, name] of Object.entries(REACT_MODULES)) {
    entries[name] = VIRTUAL_REACT + specifier
  }
  for (const name of new Set(Object.values(NODE_SHIMS))) {
    entries[`node/${name}`] = path.join(
      root,
      `lab/browser/runtime/node/${name}.ts`,
    )
  }
  return Object.fromEntries(
    Object.entries(entries).map(([name, file]) => [RUNTIME_DIR + name, file]),
  )
}

/** The repo's text files in node/, pure/ and react/: what a first visit starts with. */
function readSeed(root: string) {
  const seed: Record<string, string> = {}
  for (const file of SECTIONS.flatMap((s) => listFiles(root)[s])) {
    const bytes = readFileSync(path.join(root, file))
    if (bytes.length > MAX_SEED_FILE || bytes.includes(0)) continue
    seed[file] = bytes.toString('utf8')
  }
  return seed
}

// Served (by Netlify) for any missing path. A playground page under /vfs/ only 404s when the
// service worker didn't handle it (first visit, hard reload): retry once through it.
const NOT_FOUND_PAGE = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Não encontrado · Quick Helper</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 24px; }
    </style>
  </head>
  <body>
    <p id="message">Página não encontrada. <a href="/">Abrir o lab</a></p>
    <script>
      if (location.pathname.startsWith('${VFS}') && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('${VFS}').then((registration) => {
          let last = 0
          try { last = Number(sessionStorage.getItem('lab:vfs-retry')) || 0 } catch {}
          if (registration && registration.active && Date.now() - last > 10000) {
            try { sessionStorage.setItem('lab:vfs-retry', String(Date.now())) } catch {}
            location.reload()
          } else {
            document.getElementById('message').textContent =
              'Este arquivo é servido pelo lab, que ainda não está ativo nesta aba. Abra o lab pela página inicial.'
          }
        })
      }
    </script>
  </body>
</html>
`

export function labBuild(): Plugin {
  let root = ''
  let outDir = ''

  return {
    name: 'quick-helper-lab-build',
    apply: 'build',

    config(config) {
      const base = path.resolve(config.root ?? process.cwd())
      return {
        build: {
          rolldownOptions: {
            input: {
              index: path.join(base, 'index.html'),
              ...runtimeEntries(base),
            },
            // Runtime modules are imported by URL: keep their exports and their file names.
            preserveEntrySignatures: 'exports-only',
            output: {
              entryFileNames: (chunk) =>
                chunk.name.startsWith(RUNTIME_DIR)
                  ? '[name].js'
                  : 'assets/[name]-[hash].js',
            },
          },
        },
      }
    },

    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
    },

    resolveId: (id) => (id.startsWith(VIRTUAL_REACT) ? id : undefined),

    // /runtime/react.js & co.: ES module facades over the lab's own (CommonJS) React, so every
    // sandbox shares the copy the frame renders with.
    load(id) {
      if (!id.startsWith(VIRTUAL_REACT)) return
      const specifier = id.slice(VIRTUAL_REACT.length)
      const require = createRequire(path.join(root, 'package.json'))
      const names = Object.keys(require(specifier) as object).filter(
        (name) => /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default',
      )
      return `import M from ${JSON.stringify(specifier)}
export default M
export const { ${names.join(', ')} } = M
`
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: TYPES_JSON.slice(1),
        source: JSON.stringify(collectTypes(root)),
      })
      this.emitFile({
        type: 'asset',
        fileName: SEED_JSON.slice(1),
        source: JSON.stringify(readSeed(root)),
      })
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: NOT_FOUND_PAGE,
      })
    },

    // The service worker is a classic script (module service workers aren't supported everywhere),
    // so it gets its own IIFE build.
    async writeBundle() {
      await build({
        configFile: false,
        root,
        logLevel: 'warn',
        define: { 'process.env.NODE_ENV': '"production"' },
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          lib: {
            entry: path.join(root, 'lab/browser/sw.ts'),
            formats: ['iife'],
            name: 'quickLabServiceWorker',
            fileName: () => SERVICE_WORKER.slice(1),
          },
        },
      })
    },
  }
}
