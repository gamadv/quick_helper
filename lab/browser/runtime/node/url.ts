// node:url for the browser mode.
import { resolve } from './path.ts'

export const { URL, URLSearchParams } = globalThis

export function fileURLToPath(url: string | URL) {
  const parsed = typeof url === 'string' ? new URL(url) : url
  if (parsed.protocol !== 'file:')
    throw new TypeError('The URL must be of scheme file')
  return decodeURIComponent(parsed.pathname)
}

export function pathToFileURL(path: string) {
  const encoded = resolve(path).split('/').map(encodeURIComponent).join('/')
  return new URL(`file://${encoded}`)
}

export default { URL, URLSearchParams, fileURLToPath, pathToFileURL }
