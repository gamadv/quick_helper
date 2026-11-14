// Shared by the Vite plugin (Node) and the lab UI (browser): no Node or DOM imports here.

export const SECTIONS = ['node', 'pure', 'react'] as const
export type Section = (typeof SECTIONS)[number]
export type LabFiles = Record<Section, string[]>

export type RunMessage =
  | { type: 'stdout' | 'stderr'; data: string }
  | { type: 'exit'; code: number | null; signal: string | null; ms: number }

/** Every /__lab request must carry this header; it forces a CORS preflight on cross-site requests. */
export const LAB_HEADER = 'x-quick-lab'

export const NODE_SCRIPT = /\.(ts|mts|cts|js|mjs|cjs)$/
export const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const NOT_RUNNABLE = /\.(test|spec)\.|\.d\.ts$/

/** Hidden files and folders (dot segments) and node_modules: never listed nor served. */
export const IGNORED_PATH = /(^|\/)(\.|node_modules(\/|$))/

export function sectionOf(file: string): Section | undefined {
  const top = file.split('/')[0]
  return (SECTIONS as readonly string[]).includes(top)
    ? (top as Section)
    : undefined
}

/**
 * Normalizes a playground path ("node/a/../b.ts" -> "node/b.ts"). Returns undefined unless it
 * names a file inside node/, pure/ or react/ (absolute paths, escapes and ignored segments).
 */
export function normalizeLabPath(input: string | null | undefined) {
  if (!input || input.startsWith('/') || input.includes('\0')) return undefined
  const parts: string[] = []
  for (const segment of input.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (!parts.pop()) return undefined
    } else {
      parts.push(segment)
    }
  }
  const rel = parts.join('/')
  if (parts.length < 2 || !sectionOf(rel) || IGNORED_PATH.test(rel))
    return undefined
  return rel
}

/** Groups paths by section, sorted by folder and then by name (a folder's files before its subfolders'). */
export function groupFiles(paths: Iterable<string>): LabFiles {
  const files: LabFiles = { node: [], pure: [], react: [] }
  for (const file of paths) {
    const section = sectionOf(file)
    if (section) files[section].push(file)
  }
  const dirOf = (file: string) => file.slice(0, file.lastIndexOf('/'))
  for (const section of SECTIONS) {
    files[section].sort(
      (a, b) => dirOf(a).localeCompare(dirOf(b)) || a.localeCompare(b),
    )
  }
  return files
}

/** Files that open in the result pane: node scripts, HTML pages and React sandboxes. */
export function isRunnable(file: string) {
  if (NOT_RUNNABLE.test(file)) return false
  switch (sectionOf(file)) {
    case 'node':
      return NODE_SCRIPT.test(file)
    case 'pure':
      return file.endsWith('.html')
    case 'react':
      return file.endsWith('.tsx')
    default:
      return false
  }
}
