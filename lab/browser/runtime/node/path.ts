// node:path (POSIX) for the browser mode, ported from Node's lib/path.js. The working directory
// is "/".

const SLASH = 47
const DOT = 46

function normalizeString(path: string, allowAboveRoot: boolean) {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let code = 0
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i)
    else if (code === SLASH) break
    else code = SLASH
    if (code === SLASH) {
      if (lastSlash === i - 1 || dots === 1) {
        // Empty or "." segment.
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== DOT ||
          res.charCodeAt(res.length - 2) !== DOT
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex === -1) {
              res = ''
              lastSegmentLength = 0
            } else {
              res = res.slice(0, lastSlashIndex)
              lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
            }
            lastSlash = i
            dots = 0
            continue
          } else if (res.length !== 0) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? '/..' : '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) res += `/${path.slice(lastSlash + 1, i)}`
        else res = path.slice(lastSlash + 1, i)
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (code === DOT && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

function check(path: unknown, name = 'path'): asserts path is string {
  if (typeof path !== 'string')
    throw new TypeError(
      `The "${name}" argument must be of type string. Received ${typeof path}`,
    )
}

export const sep = '/'
export const delimiter = ':'

export function resolve(...paths: string[]) {
  let resolved = ''
  let absolute = false
  for (let i = paths.length - 1; i >= -1 && !absolute; i--) {
    const path = i >= 0 ? paths[i] : '/'
    check(path, `paths[${i}]`)
    if (path.length === 0) continue
    resolved = `${path}/${resolved}`
    absolute = path.charCodeAt(0) === SLASH
  }
  resolved = normalizeString(resolved, !absolute)
  if (absolute) return `/${resolved}`
  return resolved.length > 0 ? resolved : '.'
}

export function normalize(path: string) {
  check(path)
  if (path.length === 0) return '.'
  const absolute = path.charCodeAt(0) === SLASH
  const trailing = path.charCodeAt(path.length - 1) === SLASH
  let result = normalizeString(path, !absolute)
  if (result.length === 0) {
    if (absolute) return '/'
    return trailing ? './' : '.'
  }
  if (trailing) result += '/'
  return absolute ? `/${result}` : result
}

export const isAbsolute = (path: string) => {
  check(path)
  return path.length > 0 && path.charCodeAt(0) === SLASH
}

export function join(...paths: string[]) {
  paths.forEach((path, i) => check(path, `paths[${i}]`))
  const joined = paths.filter((path) => path.length > 0).join('/')
  return joined ? normalize(joined) : '.'
}

export function relative(from: string, to: string) {
  check(from, 'from')
  check(to, 'to')
  if (from === to) return ''
  from = resolve(from)
  to = resolve(to)
  if (from === to) return ''
  const fromStart = 1
  const fromEnd = from.length
  const fromLen = fromEnd - fromStart
  const toStart = 1
  const toLen = to.length - toStart
  const length = fromLen < toLen ? fromLen : toLen
  let lastCommonSep = -1
  let i = 0
  for (; i < length; i++) {
    const code = from.charCodeAt(fromStart + i)
    if (code !== to.charCodeAt(toStart + i)) break
    else if (code === SLASH) lastCommonSep = i
  }
  if (i === length) {
    if (toLen > length) {
      if (to.charCodeAt(toStart + i) === SLASH) return to.slice(toStart + i + 1)
      if (i === 0) return to.slice(toStart + i)
    } else if (fromLen > length) {
      if (from.charCodeAt(fromStart + i) === SLASH) lastCommonSep = i
      else if (i === 0) lastCommonSep = 0
    }
  }
  let out = ''
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === SLASH)
      out += out.length === 0 ? '..' : '/..'
  }
  return `${out}${to.slice(toStart + lastCommonSep)}`
}

export function dirname(path: string) {
  check(path)
  if (path.length === 0) return '.'
  const hasRoot = path.charCodeAt(0) === SLASH
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    if (path.charCodeAt(i) === SLASH) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      matchedSlash = false
    }
  }
  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}

export function basename(path: string, suffix?: string) {
  check(path)
  const trimmed = path.replace(/\/+$/, '')
  const base = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  if (suffix !== undefined && base !== suffix && base.endsWith(suffix))
    return base.slice(0, base.length - suffix.length)
  return base
}

export function extname(path: string) {
  check(path)
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let preDotState = 0
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i)
    if (code === SLASH) {
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
    if (code === DOT) {
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      preDotState = -1
    }
  }
  if (
    startDot === -1 ||
    end === -1 ||
    preDotState === 0 ||
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  ) {
    return ''
  }
  return path.slice(startDot, end)
}

export function parse(path: string) {
  check(path)
  const root = path.startsWith('/') ? '/' : ''
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  const slash = trimmed.lastIndexOf('/')
  const dir = slash === -1 ? '' : slash === 0 ? '/' : trimmed.slice(0, slash)
  const base = trimmed === '/' ? '' : trimmed.slice(slash + 1)
  const ext = extname(base)
  return { root, dir, base, ext, name: ext ? base.slice(0, -ext.length) : base }
}

export function format(parts: {
  root?: string
  dir?: string
  base?: string
  name?: string
  ext?: string
}) {
  const dir = parts.dir || parts.root
  const ext = parts.ext
    ? `${parts.ext.startsWith('.') ? '' : '.'}${parts.ext}`
    : ''
  const base = parts.base || `${parts.name ?? ''}${ext}`
  if (!dir) return base
  return dir === parts.root ? `${dir}${base}` : `${dir}/${base}`
}

export const toNamespacedPath = (path: string) => path

const path = {
  sep,
  delimiter,
  resolve,
  normalize,
  isAbsolute,
  join,
  relative,
  dirname,
  basename,
  extname,
  parse,
  format,
  toNamespacedPath,
  posix: undefined as unknown,
}
path.posix = path
export const posix = path

export default path
