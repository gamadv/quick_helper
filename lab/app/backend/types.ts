import type { LabFiles, RunMessage } from '../../shared.ts'

/** Extra tools of the browser backend, where files live in IndexedDB instead of on disk. */
export type BrowserStorage = {
  exportZip(): Promise<Blob>
  /** Writes the zip's playground files, replacing files with the same path; returns how many. */
  importZip(zip: Blob): Promise<number>
  /** Writes the repo's example files back, replacing files with the same path. */
  restoreExamples(): Promise<number>
}

/**
 * Where playground files live and how code runs:
 * - local (`npm run dev`): files on disk and a real Node process, via the Vite plugin;
 * - browser (static build, e.g. Netlify): files in IndexedDB, node/ scripts in a Web Worker and
 *   previews served by a service worker.
 */
export interface LabBackend {
  readonly mode: 'local' | 'browser'
  /** Previews update themselves (Vite HMR); otherwise the lab reloads them after a save. */
  readonly hotPreview: boolean
  /** Prepares previews and runs (the browser backend waits for its service worker). */
  ready(): Promise<void>

  listFiles(): Promise<LabFiles>
  /** Contents of every code file, so the editor can resolve imports between them. */
  readSources(): Promise<Record<string, string>>
  /** .d.ts files for the editor, keyed by their file:///node_modules/... path. */
  loadTypes(): Promise<Record<string, string>>
  readFile(file: string): Promise<string>
  /** Overwrites an existing file; fails if it no longer exists (deleted or renamed meanwhile). */
  saveFile(file: string, content: string): Promise<void>
  /** Creates a file, refusing to overwrite; resolves to the normalized path. */
  createFile(file: string, content: string): Promise<string>
  deleteFile(file: string): Promise<void>
  /** Moves a file (possibly across sections); resolves to the normalized destination. */
  renameFile(from: string, to: string): Promise<string>

  /** Runs a node/ script, streaming its output; resolves when it exits or `signal` aborts. */
  run(
    file: string,
    onMessage: (message: RunMessage) => void,
    signal: AbortSignal,
  ): Promise<void>
  /** URL of the page that shows a pure/ page or a react/ sandbox. */
  previewUrl(file: string): string

  /** The file list changed (created, deleted or renamed, here or elsewhere). */
  onFilesChange(listener: (files: LabFiles) => void): () => void
  /** A file was saved (here or elsewhere). */
  onFileChange(listener: (file: string) => void): () => void

  openInEditor?(file: string): void
  storage?: BrowserStorage
}
