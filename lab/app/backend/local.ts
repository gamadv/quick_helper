// `npm run dev`: talks to the Vite plugin (lab/plugin.ts), which reads and writes real files
// and runs node/ scripts in a real Node process.
import { LAB_HEADER, type LabFiles, type RunMessage } from '../../shared.ts'
import type { LabBackend } from './types.ts'

function labFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set(LAB_HEADER, '1')
  return fetch(url, { ...init, headers })
}

const fileUrl = (file: string) => `/__lab/file?path=${encodeURIComponent(file)}`

async function expectOk(res: Response, conflict?: string) {
  if (res.status === 409 && conflict) throw new Error(conflict)
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res
}

const getJson = async <T>(url: string) =>
  (await (await expectOk(await labFetch(url))).json()) as T

function onHot<T>(event: string, listener: (data: T) => void) {
  const hot = import.meta.hot
  hot?.on(event, listener)
  return () => hot?.off(event, listener)
}

export const localBackend: LabBackend = {
  mode: 'local',
  hotPreview: true,
  ready: async () => {},

  listFiles: () => getJson<LabFiles>('/__lab/files'),
  readSources: () => getJson<Record<string, string>>('/__lab/sources'),
  loadTypes: () => getJson<Record<string, string>>('/__lab/types'),

  async readFile(file) {
    return (await expectOk(await labFetch(fileUrl(file)))).text()
  },

  async saveFile(file, content) {
    await expectOk(
      await labFetch(fileUrl(file), { method: 'PUT', body: content }),
    )
  },

  async createFile(file, content) {
    const res = await labFetch(fileUrl(file), { method: 'POST', body: content })
    await expectOk(res, `${file} já existe.`)
    return ((await res.json()) as { path: string }).path
  },

  async deleteFile(file) {
    await expectOk(await labFetch(fileUrl(file), { method: 'DELETE' }))
  },

  async renameFile(from, to) {
    const res = await labFetch(
      `/__lab/rename?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { method: 'POST' },
    )
    await expectOk(res, `${to} já existe.`)
    return ((await res.json()) as { path: string }).path
  },

  // The plugin streams the process output as NDJSON; aborting the request kills the process.
  async run(file, onMessage, signal) {
    const res = await labFetch(`/__lab/run?file=${encodeURIComponent(file)}`, {
      signal,
    })
    if (!res.ok || !res.body) throw new Error(await res.text())
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      const lines = (buffer + value).split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (signal.aborted) return
        onMessage(JSON.parse(line) as RunMessage)
      }
    }
  },

  previewUrl: (file) =>
    file.startsWith('react/')
      ? `/lab/frame/react.html?file=${encodeURIComponent(file)}`
      : `/${encodeURI(file)}`,

  onFilesChange: (listener) => onHot<LabFiles>('lab:files', listener),
  onFileChange: (listener) =>
    onHot<{ file: string }>('lab:change', ({ file }) => listener(file)),

  openInEditor(file) {
    void fetch(`/__open-in-editor?file=${encodeURIComponent(file)}`)
  },
}
