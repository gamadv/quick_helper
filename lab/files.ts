// Node-side file helpers shared by the dev server plugin (plugin.ts) and the build (build.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  groupFiles,
  IGNORED_PATH,
  normalizeLabPath,
  SECTIONS,
  type LabFiles,
} from './shared.ts'

// Type definitions fed to the in-browser editor so it can type-check React and Node code.
const TYPE_PACKAGES = [
  '@types/react',
  '@types/react-dom',
  '@types/node',
  'csstype',
  'undici-types',
]

export const toPosix = (p: string) => p.split(path.sep).join('/')

export function walk(dir: string, skip?: RegExp): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      toPosix(path.relative(dir, path.join(entry.parentPath, entry.name))),
    )
    .filter((rel) => !skip?.test(rel))
}

export function listFiles(root: string): LabFiles {
  return groupFiles(
    SECTIONS.flatMap((section) =>
      walk(path.join(root, section), IGNORED_PATH).map(
        (rel) => `${section}/${rel}`,
      ),
    ),
  )
}

/** Resolves a client-supplied path, allowing only files inside node/, pure/ or react/. */
export function resolveLabPath(root: string, file: string | null) {
  const rel = normalizeLabPath(file)
  if (!rel) return undefined
  return { abs: path.join(root, ...rel.split('/')), rel }
}

/** .d.ts files of the editor's type packages, keyed by their file:///node_modules/... path. */
export function collectTypes(root: string): Record<string, string> {
  return Object.fromEntries(
    TYPE_PACKAGES.flatMap((pkg) => {
      const dir = path.join(root, 'node_modules', pkg)
      // ts5.x/ folders are typesVersions fallbacks that would clash with the main files.
      return walk(dir, /(^|\/)(ts\d|node_modules)/)
        .filter((rel) => rel.endsWith('.d.ts'))
        .map((rel) => [
          `file:///node_modules/${pkg}/${rel}`,
          readFileSync(path.join(dir, rel), 'utf8'),
        ])
    }),
  )
}
