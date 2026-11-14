// Editor buffers (Monaco models) for playground files, with dirty tracking and storage sync.
import { CODE_FILE } from '../shared.ts'
import { backend } from './backend/index.ts'
import { monaco, setTypeDefinitions } from './monaco.ts'

type Entry = { model: monaco.editor.ITextModel; savedVersion: number }

const entries = new Map<string, Entry>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export const fileOf = (model: monaco.editor.ITextModel) =>
  model.uri.path.slice(1)

function track(file: string, content: string) {
  const existing = entries.get(file)
  if (existing) return existing
  const uri = monaco.Uri.file(`/${file}`)
  // getModel: after an HMR re-run of this module, Monaco still holds the old models.
  const model =
    monaco.editor.getModel(uri) ??
    monaco.editor.createModel(content, undefined, uri)
  const entry = { model, savedVersion: model.getAlternativeVersionId() }
  model.onDidChangeContent(notify)
  entries.set(file, entry)
  return entry
}

let ready: Promise<void> | undefined

/** Loads type definitions and every code file once, so cross-file IntelliSense works. */
export function initWorkspace() {
  ready ??= (async () => {
    const [types, sources] = await Promise.all([
      backend.loadTypes(),
      backend.readSources(),
    ])
    setTypeDefinitions(types)
    for (const [file, content] of Object.entries(sources)) track(file, content)
  })().catch((err: unknown) => {
    ready = undefined // let the next call retry
    throw err
  })
  return ready
}

/** The buffer for `file` if it's already loaded (synchronous, unlike openModel). */
export const loadedModel = (file: string) => entries.get(file)?.model

export async function openModel(file: string) {
  await initWorkspace()
  const existing = entries.get(file)
  if (existing) return existing.model
  const content = await backend.readFile(file)
  return track(file, content).model
}

export function isDirty(file: string) {
  const entry = entries.get(file)
  return !!entry && entry.model.getAlternativeVersionId() !== entry.savedVersion
}

/** Files with unsaved edits, as a stable string (a useSyncExternalStore snapshot). */
export function dirtyFiles() {
  return [...entries.keys()].filter(isDirty).sort().join('\n')
}

const saving = new Map<string, Promise<void>>()

/** Saves `file` if it has unsaved edits. Saves of the same file run one after another. */
export function save(file: string): Promise<void> {
  const previous = saving.get(file) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(() => saveNow(file))
  saving.set(file, next)
  void next
    .finally(() => saving.get(file) === next && saving.delete(file))
    .catch(() => undefined)
  return next
}

async function saveNow(file: string) {
  const entry = entries.get(file)
  if (!entry || !isDirty(file)) return
  const version = entry.model.getAlternativeVersionId()
  await backend.saveFile(file, entry.model.getValue())
  if (entries.get(file) !== entry) return
  entry.savedVersion = version
  notify()
}

/** Marks the buffer clean so no pending or flushed auto-save writes it (before deleting). */
export function discardChanges(file: string) {
  const entry = entries.get(file)
  if (!entry) return
  entry.savedVersion = entry.model.getAlternativeVersionId()
  notify()
}

/** Drops the buffer right away (after a rename, the old path must not be saved again). */
export function forget(file: string) {
  const entry = entries.get(file)
  if (!entry) return
  entries.delete(file)
  entry.model.dispose()
  notify()
}

/** Pulls in a change made elsewhere (VS Code, another tab), unless the buffer has unsaved edits. */
export async function syncFromStorage(file: string) {
  const entry = entries.get(file)
  if (!entry || isDirty(file)) return
  const content = await backend.readFile(file).catch(() => undefined)
  // The buffer may have been edited, dropped or replaced while we were reading.
  if (content === undefined || entries.get(file) !== entry || isDirty(file))
    return
  if (content === entry.model.getValue()) return
  const range = entry.model.getFullModelRange()
  entry.model.pushEditOperations([], [{ range, text: content }], () => null)
  entry.savedVersion = entry.model.getAlternativeVersionId()
  notify()
}

/** Drops buffers of deleted files and loads new code files so imports of them resolve. */
export async function syncFileList(files: string[]) {
  await initWorkspace()
  const present = new Set(files)
  for (const file of [...entries.keys()]) {
    if (!present.has(file)) forget(file)
  }
  const added = files.filter((f) => CODE_FILE.test(f) && !entries.has(f))
  await Promise.all(
    added.map(async (f) => {
      const content = await backend.readFile(f).catch(() => undefined)
      if (content !== undefined) track(f, content)
    }),
  )
  notify()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
