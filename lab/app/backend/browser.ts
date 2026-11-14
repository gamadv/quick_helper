// Static build (e.g. Netlify): everything runs in the browser. Files live in IndexedDB, a service
// worker serves them to previews and to the node worker (lab/browser/sw.ts), and node/ scripts
// run in a Web Worker started by a hidden page (lab/browser/runtime/node-worker.ts).
import {
  SEED_JSON,
  SERVICE_WORKER,
  TYPES_JSON,
  VFS,
  vfsUrl,
} from '../../browser/paths.ts'
import * as vfs from '../../browser/vfs.ts'
import {
  CODE_FILE,
  groupFiles,
  normalizeLabPath,
  type LabFiles,
  type RunMessage,
} from '../../shared.ts'
import type { LabBackend } from './types.ts'

// --- Change notifications (this tab and, via BroadcastChannel, the other open tabs) -----------

type Broadcast = { type: 'files' } | { type: 'change'; file: string }
const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('quick-lab')
    : undefined
const fileListeners = new Set<(files: LabFiles) => void>()
const changeListeners = new Set<(file: string) => void>()

async function filesChanged(broadcast = true) {
  if (broadcast) channel?.postMessage({ type: 'files' } satisfies Broadcast)
  const files = await listFiles()
  fileListeners.forEach((listener) => listener(files))
}

function fileSaved(file: string, broadcast = true) {
  if (broadcast)
    channel?.postMessage({ type: 'change', file } satisfies Broadcast)
  changeListeners.forEach((listener) => listener(file))
}

channel?.addEventListener('message', (event: MessageEvent<Broadcast>) => {
  if (event.data.type === 'files') void filesChanged(false)
  else fileSaved(event.data.file, false)
})

function subscribe<T>(set: Set<T>, listener: T) {
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

// --- Storage -----------------------------------------------------------------------------------

async function fetchJson<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

const fetchSeed = () => fetchJson<Record<string, string>>(SEED_JSON)

let seeding: Promise<void> | undefined
/** The first visit starts with the repo's files. */
function storage() {
  seeding ??= vfs.seed(fetchSeed).catch((err: unknown) => {
    seeding = undefined
    throw new Error(
      `Não foi possível abrir o armazenamento do navegador (IndexedDB): ${err}`,
    )
  })
  return seeding
}

async function listFiles() {
  await storage()
  return groupFiles(await vfs.listPaths())
}

function validPath(file: string) {
  const rel = normalizeLabPath(file)
  if (!rel) throw new Error(`Caminho inválido: ${file}`)
  return rel
}

let persistRequested = false
/** Asks the browser not to evict the files under storage pressure (once, on the first save). */
function requestPersistence() {
  if (persistRequested) return
  persistRequested = true
  void navigator.storage?.persist?.().catch(() => undefined)
}

/** Keeps text files of a zip, dropping a top folder (e.g. "quick_helper-main/") if needed. */
async function readZip(zip: Blob) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const entries = Object.entries(
    unzipSync(new Uint8Array(await zip.arrayBuffer())),
  )
  const files: [string, string][] = []
  for (const [name, bytes] of entries) {
    if (name.endsWith('/') || bytes.slice(0, 8000).includes(0)) continue
    const rel =
      normalizeLabPath(name) ??
      normalizeLabPath(name.slice(name.indexOf('/') + 1))
    if (rel) files.push([rel, strFromU8(bytes)])
  }
  return files
}

async function writeAll(files: [string, string][]) {
  await storage()
  await vfs.writeFiles(files)
  await filesChanged()
  for (const [file] of files) fileSaved(file)
  return files.length
}

// --- Service worker ----------------------------------------------------------------------------

let serviceWorker: Promise<void> | undefined
/** Previews and runs need the service worker active (it serves /vfs/). */
function ensureServiceWorker() {
  serviceWorker ??= (async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error(
        'Este navegador não oferece service workers, que o lab usa para mostrar as páginas e rodar os scripts (em janelas anônimas do Firefox eles ficam desativados).',
      )
    }
    const registration = await navigator.serviceWorker.register(
      SERVICE_WORKER,
      { scope: VFS },
    )
    if (registration.active) return
    const worker = registration.installing ?? registration.waiting
    if (!worker) throw new Error('O service worker do lab não iniciou.')
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (worker.state === 'activated') resolve()
        else if (worker.state === 'redundant')
          reject(new Error('O service worker do lab não conseguiu iniciar.'))
      }
      worker.addEventListener('statechange', check)
      check()
    })
  })().catch((err: unknown) => {
    serviceWorker = undefined
    throw err
  })
  return serviceWorker
}

// --- Running node/ scripts ---------------------------------------------------------------------

type RunnerMessage = {
  source?: string
  message?: RunMessage | { type: 'ready' }
}

/** Runs the script in a worker started by a hidden page under /vfs/; removing the page stops it. */
async function run(
  file: string,
  onMessage: (message: RunMessage) => void,
  signal: AbortSignal,
) {
  await ensureServiceWorker()
  if (signal.aborted) return
  const frame = document.createElement('iframe')
  frame.hidden = true
  frame.src = `${VFS}__node/runner.html`
  await new Promise<void>((resolve) => {
    const finish = () => {
      window.removeEventListener('message', onWindowMessage)
      signal.removeEventListener('abort', finish)
      frame.remove()
      resolve()
    }
    const onWindowMessage = (event: MessageEvent<RunnerMessage>) => {
      if (event.source !== frame.contentWindow) return
      const { source, message } = event.data ?? {}
      if (source !== 'quick-lab-node' || !message) return
      if (message.type === 'ready') {
        frame.contentWindow?.postMessage({ entry: file }, location.origin)
        return
      }
      onMessage(message)
      if (message.type === 'exit') finish()
    }
    window.addEventListener('message', onWindowMessage)
    signal.addEventListener('abort', finish, { once: true })
    document.body.append(frame)
  })
}

// --- Backend -----------------------------------------------------------------------------------

export const browserBackend: LabBackend = {
  mode: 'browser',
  hotPreview: false,
  ready: ensureServiceWorker,

  listFiles,

  async readSources() {
    await storage()
    return Object.fromEntries(
      (await vfs.readAll()).filter(([file]) => CODE_FILE.test(file)),
    )
  },

  loadTypes: () => fetchJson<Record<string, string>>(TYPES_JSON),

  async readFile(file) {
    await storage()
    const content = await vfs.readFile(file)
    if (content === undefined)
      throw new Error(`Arquivo não encontrado: ${file}`)
    return content
  },

  async saveFile(file, content) {
    await storage()
    await vfs.saveFile(file, content)
    requestPersistence()
    fileSaved(file)
  },

  async createFile(file, content) {
    await storage()
    const rel = validPath(file)
    await vfs.createFile(rel, content)
    await filesChanged()
    return rel
  },

  async deleteFile(file) {
    await storage()
    await vfs.deleteFile(file)
    await filesChanged()
  },

  async renameFile(from, to) {
    await storage()
    const rel = validPath(to)
    await vfs.renameFile(from, rel)
    await filesChanged()
    return rel
  },

  run,

  previewUrl: (file) =>
    file.startsWith('react/')
      ? `${VFS}__frame/react.html?file=${encodeURIComponent(file)}`
      : vfsUrl(file),

  onFilesChange: (listener) => subscribe(fileListeners, listener),
  onFileChange: (listener) => subscribe(changeListeners, listener),

  storage: {
    async exportZip() {
      const { zipSync, strToU8 } = await import('fflate')
      await storage()
      const entries = (await vfs.readAll()).map(
        ([file, content]) => [file, strToU8(content)] as const,
      )
      const zip = zipSync(Object.fromEntries(entries))
      return new Blob([zip], { type: 'application/zip' })
    },
    importZip: async (zip) => writeAll(await readZip(zip)),
    restoreExamples: async () => writeAll(Object.entries(await fetchSeed())),
  },
}
