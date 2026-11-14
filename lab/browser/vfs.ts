// Browser mode storage: playground files in IndexedDB (path -> content). Used by the lab UI and
// by the service worker, which serves these files to previews and to the node worker.

const DB_NAME = 'quick-lab'
const FILES = 'files'
const META = 'meta'

export class VfsError extends Error {
  readonly code: 'not-found' | 'exists'
  constructor(message: string, code: 'not-found' | 'exists') {
    super(message)
    this.code = code
  }
}

let opening: Promise<IDBDatabase> | undefined

function openDb() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FILES)
      request.result.createObjectStore(META)
    }
    request.onsuccess = () => {
      const db = request.result
      // A newer version of the lab (another tab, after a deploy) wants to upgrade: let it.
      db.onversionchange = () => {
        db.close()
        opening = undefined
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  }).catch((err: unknown) => {
    opening = undefined
    throw err
  })
  return opening
}

const result = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

/** Runs `body` in one transaction; resolves once it commits (rolls back if `body` throws). */
async function transaction<T>(
  mode: IDBTransactionMode,
  body: (files: IDBObjectStore, meta: IDBObjectStore) => Promise<T>,
) {
  const tx = (await openDb()).transaction([FILES, META], mode)
  const committed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada'))
  })
  try {
    const value = await body(tx.objectStore(FILES), tx.objectStore(META))
    await committed
    return value
  } catch (err) {
    committed.catch(() => undefined)
    try {
      tx.abort()
    } catch {
      // Already finished.
    }
    throw err
  }
}

export const readFile = (file: string) =>
  transaction('readonly', (files) => result(files.get(file))) as Promise<
    string | undefined
  >

export const listPaths = () =>
  transaction('readonly', async (files) =>
    (await result(files.getAllKeys())).map(String),
  )

export const readAll = () =>
  transaction('readonly', async (files) => {
    const [keys, values] = await Promise.all([
      result(files.getAllKeys()),
      result(files.getAll()),
    ])
    return keys.map((key, i) => [String(key), String(values[i])] as const)
  })

/** Overwrites an existing file; a late auto-save must not resurrect a deleted or renamed one. */
export const saveFile = (file: string, content: string) =>
  transaction('readwrite', async (files) => {
    if ((await result(files.getKey(file))) === undefined)
      throw new VfsError(`Arquivo não encontrado: ${file}`, 'not-found')
    files.put(content, file)
  })

export const createFile = (file: string, content: string) =>
  transaction('readwrite', async (files) => {
    if ((await result(files.getKey(file))) !== undefined)
      throw new VfsError(`${file} já existe.`, 'exists')
    files.put(content, file)
  })

export const deleteFile = (file: string) =>
  transaction('readwrite', async (files) => {
    if ((await result(files.getKey(file))) === undefined)
      throw new VfsError(`Arquivo não encontrado: ${file}`, 'not-found')
    files.delete(file)
  })

export const renameFile = (from: string, to: string) =>
  transaction('readwrite', async (files) => {
    const content = (await result(files.get(from))) as string | undefined
    if (content === undefined)
      throw new VfsError(`Arquivo não encontrado: ${from}`, 'not-found')
    if ((await result(files.getKey(to))) !== undefined)
      throw new VfsError(`${to} já existe.`, 'exists')
    files.put(content, to)
    files.delete(from)
  })

/** Creates or replaces several files at once (zip import, restoring the examples). */
export const writeFiles = (entries: Iterable<readonly [string, string]>) =>
  transaction('readwrite', async (files) => {
    for (const [file, content] of entries) files.put(content, file)
  })

/** On the first visit, fills the store with the repo's files (`load` fetches them). */
export async function seed(load: () => Promise<Record<string, string>>) {
  const seeded = await transaction('readonly', (_files, meta) =>
    result(meta.get('seeded')),
  )
  if (seeded) return
  const initial = await load()
  await transaction('readwrite', async (files, meta) => {
    // Another tab may have seeded it in the meantime.
    if (await result(meta.get('seeded'))) return
    for (const [file, content] of Object.entries(initial))
      files.put(content, file)
    meta.put(true, 'seeded')
  })
}
