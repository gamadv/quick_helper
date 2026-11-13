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

export function sectionOf(file: string): Section | undefined {
  const top = file.split('/')[0]
  return (SECTIONS as readonly string[]).includes(top)
    ? (top as Section)
    : undefined
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
