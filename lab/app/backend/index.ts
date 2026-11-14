import type { LabBackend } from './types.ts'

// `npm run dev` uses the Vite plugin (disk + real Node); the static build runs fully in the
// browser. The condition is a build-time constant, so each bundle carries only its backend.
export const backend: LabBackend = import.meta.env.DEV
  ? (await import('./local.ts')).localBackend
  : (await import('./browser.ts')).browserBackend

export type { BrowserStorage, LabBackend } from './types.ts'
