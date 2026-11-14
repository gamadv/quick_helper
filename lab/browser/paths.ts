// URLs of the browser mode (static build). Shared by the build plugin, the service worker and the
// lab UI, so keep it free of Node and DOM imports.

/** Playground files, served from IndexedDB by the service worker (its scope). */
export const VFS = '/vfs/'
export const SERVICE_WORKER = '/sw.js'
/** Static assets written by the build: editor types and the repo's files (first-visit content). */
export const TYPES_JSON = '/lab-types.json'
export const SEED_JSON = '/lab-seed.json'

/** Built modules with stable URLs, imported by code running in previews and in the node worker. */
export const RUNTIME = '/runtime/'

/** Bare React imports, mapped to the lab's own React build so every sandbox shares one copy. */
export const REACT_MODULES: Record<string, string> = {
  react: 'react',
  'react/jsx-runtime': 'react-jsx-runtime',
  'react-dom': 'react-dom',
  'react-dom/client': 'react-dom-client',
}

/** Node built-ins with a browser shim (lab/browser/runtime/node/<name>.ts). */
export const NODE_SHIMS: Record<string, string> = {
  assert: 'assert',
  'assert/strict': 'assert-strict',
  crypto: 'crypto',
  events: 'events',
  path: 'path',
  'path/posix': 'path',
  perf_hooks: 'perf_hooks',
  process: 'process',
  timers: 'timers',
  'timers/promises': 'timers-promises',
  url: 'url',
  util: 'util',
}

/** Encodes each segment of a playground path for use in a URL. */
export const encodePath = (file: string) =>
  file.split('/').map(encodeURIComponent).join('/')

export const vfsUrl = (file: string) => VFS + encodePath(file)
