// A browser port of the parts of Node's util.inspect / util.format that console output relies on,
// so node/ scripts print the same text in the browser as in Node (no colors).

export type InspectOptions = {
  depth?: number | null
  showHidden?: boolean
  breakLength?: number
  compact?: number
  sorted?: boolean
  maxArrayLength?: number
  maxStringLength?: number
}

const CUSTOM = Symbol.for('nodejs.util.inspect.custom')

type Context = {
  depth: number
  showHidden: boolean
  breakLength: number
  compact: number
  sorted: boolean
  maxArrayLength: number
  maxStringLength: number
  options: InspectOptions
  seen: object[]
  circular: Map<object, number>
  indentationLvl: number
  currentDepth: number
}

// Property kinds, as in Node: object entries, array items, and an array's extra keys.
const OBJECT = 0
const ARRAY = 1
const ARRAY_EXTRAS = 2
type Kind = typeof OBJECT | typeof ARRAY | typeof ARRAY_EXTRAS

/** Error stacks pass through this (the node worker maps browser URLs back to file paths). */
let formatStack = (stack: string, _error: Error) => stack
export function setStackFormatter(fn: (stack: string, error: Error) => string) {
  formatStack = fn
}

export function inspect(value: unknown, options: InspectOptions = {}) {
  const ctx: Context = {
    depth: options.depth === undefined ? 2 : (options.depth ?? Infinity),
    showHidden: options.showHidden ?? false,
    breakLength: options.breakLength ?? 80,
    compact: options.compact ?? 3,
    sorted: options.sorted ?? false,
    maxArrayLength: options.maxArrayLength ?? 100,
    maxStringLength: options.maxStringLength ?? 10000,
    options,
    seen: [],
    circular: new Map(),
    indentationLvl: 0,
    currentDepth: 0,
  }
  return formatValue(ctx, value, 0)
}
/** Objects can format themselves with a [inspect.custom](depth, options, inspect) method. */
inspect.custom = CUSTOM

const isObject = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

function formatValue(ctx: Context, value: unknown, recurseTimes: number) {
  if (!isObject(value)) return formatPrimitive(ctx, value)
  const custom = (value as { [CUSTOM]?: unknown })[CUSTOM]
  // Skip prototypes (e.g. Foo.prototype), whose method is meant for instances.
  const isPrototype =
    Object.getOwnPropertyDescriptor(value, 'constructor')?.value?.prototype ===
    value
  if (typeof custom === 'function' && custom !== inspect && !isPrototype) {
    const depth = ctx.depth - recurseTimes
    const result: unknown = custom.call(
      value,
      depth,
      { ...ctx.options, depth },
      inspect,
    )
    if (result !== value) {
      if (typeof result !== 'string')
        return formatValue(ctx, result, recurseTimes)
      return result.replaceAll('\n', `\n${' '.repeat(ctx.indentationLvl)}`)
    }
  }
  if (ctx.seen.includes(value)) {
    let index = ctx.circular.get(value)
    if (index === undefined) {
      index = ctx.circular.size + 1
      ctx.circular.set(value, index)
    }
    return `[Circular *${index}]`
  }
  return formatRaw(ctx, value, recurseTimes)
}

// --- Primitives --------------------------------------------------------------------------------

const ESCAPES: Record<string, string> = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  "'": "\\'",
  '\\': '\\\\',
}

/** Quotes like Node: single quotes, or double quotes / backticks to avoid escaping a quote. */
function quote(str: string) {
  let mark = "'"
  if (str.includes("'")) {
    if (!str.includes('"')) mark = '"'
    else if (!str.includes('`') && !str.includes('${')) mark = '`'
  }
  const escaped = str.replace(
    /[\x00-\x1f\x27\x5c\x7f-\x9f]/g,
    (char) =>
      (char === "'" && mark !== "'" ? char : ESCAPES[char]) ??
      `\\x${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
  )
  return mark + escaped + mark
}

function formatNumber(value: number) {
  return Object.is(value, -0) ? '-0' : `${value}`
}

function formatPrimitive(ctx: Context, value: unknown): string {
  switch (typeof value) {
    case 'string': {
      let str = value
      let trailer = ''
      if (str.length > ctx.maxStringLength) {
        const remaining = str.length - ctx.maxStringLength
        str = str.slice(0, ctx.maxStringLength)
        trailer = `... ${remaining} more character${remaining > 1 ? 's' : ''}`
      }
      // Long strings are split at line breaks into concatenated lines.
      if (
        str.length > 16 &&
        str.length > ctx.breakLength - ctx.indentationLvl - 4
      ) {
        return (
          str
            .split(/(?<=\n)/)
            .map(quote)
            .join(` +\n${' '.repeat(ctx.indentationLvl + 2)}`) + trailer
        )
      }
      return quote(str) + trailer
    }
    case 'number':
      return formatNumber(value)
    case 'bigint':
      return `${value}n`
    case 'symbol':
      return value.toString()
    default:
      return String(value)
  }
}

// --- Objects -----------------------------------------------------------------------------------

function getConstructorName(obj: object): string | null {
  let current: object | null = obj
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, 'constructor')
    if (
      typeof descriptor?.value === 'function' &&
      descriptor.value.name !== '' &&
      obj instanceof descriptor.value
    ) {
      return String(descriptor.value.name)
    }
    current = Object.getPrototypeOf(current) as object | null
  }
  return Object.getPrototypeOf(obj) === null ? null : 'Object'
}

function getPrefix(
  constructor: string | null,
  tag: string,
  fallback: string,
  size = '',
) {
  if (constructor === null) {
    if (tag !== '' && fallback !== tag)
      return `[${fallback}${size}: null prototype] [${tag}] `
    return `[${fallback}${size}: null prototype] `
  }
  if (tag !== '' && constructor !== tag)
    return `${constructor}${size} [${tag}] `
  return `${constructor}${size} `
}

const isIndex = (key: string) => /^(0|[1-9]\d*)$/.test(key)

function getKeys(value: object, showHidden: boolean, skipIndexes = false) {
  const names = showHidden
    ? Object.getOwnPropertyNames(value)
    : Object.keys(value)
  const keys: PropertyKey[] = skipIndexes
    ? names.filter((key) => !isIndex(key))
    : names
  for (const symbol of Object.getOwnPropertySymbols(value)) {
    if (showHidden || Object.prototype.propertyIsEnumerable.call(value, symbol))
      keys.push(symbol)
  }
  return keys
}

const typeTag = (value: object) =>
  Object.prototype.toString.call(value).slice(8, -1)

function getFunctionBase(
  fn: Function,
  constructor: string | null,
  tag: string,
) {
  const source = Function.prototype.toString.call(fn)
  if (source.startsWith('class') && source.endsWith('}')) {
    const name = (Object.hasOwn(fn, 'name') && fn.name) || '(anonymous)'
    let base = `class ${name}`
    if (constructor !== 'Function' && constructor !== null)
      base += ` [${constructor}]`
    if (tag !== '' && constructor !== tag) base += ` [${tag}]`
    if (constructor === null) {
      base += ' extends [null prototype]'
    } else {
      const parent = (Object.getPrototypeOf(fn) as Function | null)?.name
      if (parent) base += ` extends ${parent}`
    }
    return `[${base}]`
  }
  let type = 'Function'
  const kind = typeTag(fn)
  if (kind.includes('Generator')) type = `Generator${type}`
  if (kind.startsWith('Async')) type = `Async${type}`
  let base = `[${type}`
  if (constructor === null) base += ' (null prototype)'
  base += fn.name === '' ? ' (anonymous)' : `: ${fn.name}`
  base += ']'
  if (constructor !== type && constructor !== null) base += ` ${constructor}`
  if (tag !== '' && constructor !== tag) base += ` [${tag}]`
  return base
}

function formatError(ctx: Context, err: Error, keys: PropertyKey[]) {
  const name = err.name != null ? String(err.name) : 'Error'
  let stack =
    typeof err.stack === 'string' && err.stack
      ? formatStack(err.stack, err)
      : Error.prototype.toString.call(err)
  // name/message/stack are already part of the stack text.
  for (const key of ['name', 'message', 'stack'] as const) {
    const index = keys.indexOf(key)
    if (index !== -1 && stack.includes(String(err[key]))) keys.splice(index, 1)
  }
  if ('cause' in err && !keys.includes('cause')) keys.push('cause')
  if (!stack.includes(name)) stack = `${name}: ${stack}`
  // Without a stack trace, wrap it in brackets.
  const message = err.message ? String(err.message) : ''
  const from = message ? stack.indexOf(message) + message.length : 0
  if (stack.indexOf('\n    at', from) === -1) stack = `[${stack}]`
  if (ctx.indentationLvl !== 0) {
    stack = stack.split('\n').join(`\n${' '.repeat(ctx.indentationLvl)}`)
  }
  return stack
}

type Formatter = (ctx: Context, value: any, recurseTimes: number) => string[]

const remainingText = (remaining: number) =>
  `... ${remaining} more item${remaining > 1 ? 's' : ''}`

const formatArray: Formatter = (ctx, value: unknown[], recurseTimes) => {
  const length = Math.min(Math.max(0, ctx.maxArrayLength), value.length)
  const output: string[] = []
  for (let i = 0; i < length; i++) {
    if (!Object.hasOwn(value, i)) {
      let holes = 1
      while (i + holes < length && !Object.hasOwn(value, i + holes)) holes++
      output.push(`<${holes} empty item${holes > 1 ? 's' : ''}>`)
      i += holes - 1
      continue
    }
    output.push(formatProperty(ctx, value, recurseTimes, i, ARRAY))
  }
  if (value.length > length) output.push(remainingText(value.length - length))
  return output
}

const formatTypedArray: Formatter = (
  ctx,
  value: ArrayLike<number | bigint>,
) => {
  const length = Math.min(Math.max(0, ctx.maxArrayLength), value.length)
  const output: string[] = []
  for (let i = 0; i < length; i++) {
    const item = value[i]
    output.push(typeof item === 'bigint' ? `${item}n` : formatNumber(item))
  }
  if (value.length > length) output.push(remainingText(value.length - length))
  return output
}

const formatSet: Formatter = (ctx, value: Set<unknown>, recurseTimes) => {
  const max = Math.min(Math.max(0, ctx.maxArrayLength), value.size)
  const output: string[] = []
  ctx.indentationLvl += 2
  for (const item of value) {
    if (output.length >= max) break
    output.push(formatValue(ctx, item, recurseTimes))
  }
  if (value.size > max) output.push(remainingText(value.size - max))
  ctx.indentationLvl -= 2
  return output
}

const formatMap: Formatter = (
  ctx,
  value: Map<unknown, unknown>,
  recurseTimes,
) => {
  const max = Math.min(Math.max(0, ctx.maxArrayLength), value.size)
  const output: string[] = []
  ctx.indentationLvl += 2
  for (const [key, item] of value) {
    if (output.length >= max) break
    output.push(
      `${formatValue(ctx, key, recurseTimes)} => ${formatValue(ctx, item, recurseTimes)}`,
    )
  }
  if (value.size > max) output.push(remainingText(value.size - max))
  ctx.indentationLvl -= 2
  return output
}

const noEntries: Formatter = () => []

function formatProperty(
  ctx: Context,
  value: object,
  recurseTimes: number,
  key: PropertyKey,
  kind: Kind,
) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key) ?? {
    value: (value as Record<PropertyKey, unknown>)[key],
    enumerable: true,
  }
  let str: string
  if (descriptor.value !== undefined) {
    ctx.indentationLvl += 2
    str = formatValue(ctx, descriptor.value, recurseTimes)
    ctx.indentationLvl -= 2
  } else if (descriptor.get !== undefined) {
    str = descriptor.set !== undefined ? '[Getter/Setter]' : '[Getter]'
  } else if (descriptor.set !== undefined) {
    str = '[Setter]'
  } else {
    str = 'undefined'
  }
  if (kind === ARRAY) return str

  let name: string
  if (typeof key === 'symbol') {
    name =
      descriptor.enumerable === false ? `[${key.toString()}]` : key.toString()
  } else if (key === '__proto__') {
    name = "['__proto__']"
  } else if (descriptor.enumerable === false) {
    name = `[${key}]`
  } else if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(String(key))) {
    name = String(key)
  } else {
    name = quote(String(key))
  }
  return `${name}: ${str}`
}

function formatRaw(ctx: Context, value: object, recurseTimes: number): string {
  const constructor = getConstructorName(value)
  const rawTag = (value as { [Symbol.toStringTag]?: unknown })[
    Symbol.toStringTag
  ]
  const tag =
    typeof rawTag === 'string' &&
    !Object.prototype.propertyIsEnumerable.call(value, Symbol.toStringTag)
      ? rawTag
      : ''

  let keys: PropertyKey[]
  let base = ''
  let braces: [string, string] = ['{', '}']
  let formatter: Formatter = noEntries
  let kind: Kind = OBJECT

  if (Array.isArray(value)) {
    keys = getKeys(value, ctx.showHidden, true)
    const prefix =
      constructor !== 'Array' || tag !== ''
        ? getPrefix(constructor, tag, 'Array', `(${value.length})`)
        : ''
    braces = [`${prefix}[`, ']']
    if (value.length === 0 && keys.length === 0) return `${braces[0]}]`
    kind = ARRAY_EXTRAS
    formatter = formatArray
  } else if (value instanceof Set) {
    keys = getKeys(value, ctx.showHidden)
    const prefix = getPrefix(constructor, tag, 'Set', `(${value.size})`)
    if (value.size === 0 && keys.length === 0) return `${prefix}{}`
    braces = [`${prefix}{`, '}']
    formatter = formatSet
  } else if (value instanceof Map) {
    keys = getKeys(value, ctx.showHidden)
    const prefix = getPrefix(constructor, tag, 'Map', `(${value.size})`)
    if (value.size === 0 && keys.length === 0) return `${prefix}{}`
    braces = [`${prefix}{`, '}']
    formatter = formatMap
  } else if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const typed = value as unknown as ArrayLike<number>
    keys = getKeys(value, ctx.showHidden, true)
    const prefix = getPrefix(
      constructor,
      tag,
      typeTag(value),
      `(${typed.length})`,
    )
    braces = [`${prefix}[`, ']']
    if (typed.length === 0 && keys.length === 0) return `${braces[0]}]`
    formatter = formatTypedArray
    kind = ARRAY_EXTRAS
  } else {
    keys = getKeys(value, ctx.showHidden)
    if (constructor === 'Object' && tag === '' && typeof value !== 'function') {
      if (keys.length === 0) return '{}'
    } else if (typeof value === 'function') {
      base = getFunctionBase(value, constructor, tag)
      if (keys.length === 0) return base
    } else if (value instanceof RegExp) {
      base = RegExp.prototype.toString.call(value)
      const prefix = getPrefix(constructor, tag, 'RegExp')
      if (prefix !== 'RegExp ') base = `${prefix}${base}`
      if (keys.length === 0) return base
    } else if (value instanceof Date) {
      base = Number.isNaN(value.getTime())
        ? Date.prototype.toString.call(value)
        : Date.prototype.toISOString.call(value)
      const prefix = getPrefix(constructor, tag, 'Date')
      if (prefix !== 'Date ') base = `${prefix}${base}`
      if (keys.length === 0) return base
    } else if (value instanceof Error) {
      base = formatError(ctx, value, keys)
      if (keys.length === 0) return base
    } else if (value instanceof Promise) {
      // The state of a promise can't be read synchronously in the browser.
      braces[0] = `${getPrefix(constructor, tag, 'Promise')}{`
      formatter = () => ['<unknown>']
    } else if (value instanceof WeakSet || value instanceof WeakMap) {
      const name = value instanceof WeakSet ? 'WeakSet' : 'WeakMap'
      braces[0] = `${getPrefix(constructor, tag, name)}{`
      formatter = () => ['<items unknown>']
    } else if (value instanceof ArrayBuffer) {
      braces[0] = `${getPrefix(constructor, tag, 'ArrayBuffer')}{`
      formatter = () => {
        const bytes = [...new Uint8Array(value).slice(0, 50)]
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
        const more =
          value.byteLength > 50
            ? ` ... ${value.byteLength - 50} more bytes`
            : ''
        return [
          `[Uint8Contents]: <${bytes}${more}>`,
          `[byteLength]: ${value.byteLength}`,
        ]
      }
    } else if (
      value instanceof Number ||
      value instanceof String ||
      value instanceof Boolean ||
      (typeof BigInt === 'function' && typeTag(value) === 'BigInt') ||
      typeTag(value) === 'Symbol'
    ) {
      const primitive = (value as { valueOf(): unknown }).valueOf()
      const type = typeTag(value)
      base = `[${type}: ${formatPrimitive({ ...ctx, compact: 3 }, primitive)}]`
      if (value instanceof String)
        keys = keys.filter(
          (k) => typeof k !== 'string' || (!isIndex(k) && k !== 'length'),
        )
      if (keys.length === 0) return base
    } else {
      braces[0] = `${getPrefix(constructor, tag, 'Object')}{`
      if (keys.length === 0) return `${braces[0]}}`
    }
  }

  if (recurseTimes > ctx.depth) {
    const name = getPrefix(constructor, tag, 'Object').slice(0, -1)
    return constructor !== null ? `[${name}]` : name
  }

  recurseTimes += 1
  ctx.seen.push(value)
  ctx.currentDepth = recurseTimes
  const output = formatter(ctx, value, recurseTimes)
  for (const key of keys) {
    output.push(formatProperty(ctx, value, recurseTimes, key, kind))
  }
  const reference = ctx.circular.get(value)
  if (reference !== undefined) {
    base = base === '' ? `<ref *${reference}>` : `<ref *${reference}> ${base}`
  }
  ctx.seen.pop()
  if (ctx.sorted && kind === OBJECT) output.sort()
  return reduceToSingleString(
    ctx,
    output,
    base,
    braces,
    kind,
    recurseTimes,
    value,
  )
}

// --- Layout (Node's compact = 3 mode) ----------------------------------------------------------

function isBelowBreakLength(
  ctx: Context,
  output: string[],
  start: number,
  base: string,
) {
  let total = output.length + start
  if (total + output.length > ctx.breakLength) return false
  for (const entry of output) {
    total += entry.length
    if (total > ctx.breakLength) return false
  }
  return base === '' || !base.includes('\n')
}

/** Lays out many short array items in aligned columns. */
function groupArrayElements(ctx: Context, output: string[], value: unknown) {
  let totalLength = 0
  let maxLength = 0
  let outputLength = output.length
  // The "... more items" entry is not part of the grid.
  if (ctx.maxArrayLength < output.length) outputLength--
  const separatorSpace = 2
  const dataLen: number[] = []
  for (let i = 0; i < outputLength; i++) {
    const len = output[i].length
    dataLen[i] = len
    totalLength += len + separatorSpace
    if (maxLength < len) maxLength = len
  }
  const actualMax = maxLength + separatorSpace
  if (
    actualMax * 3 + ctx.indentationLvl < ctx.breakLength &&
    (totalLength / actualMax > 5 || maxLength <= 6)
  ) {
    const averageBias = Math.sqrt(actualMax - totalLength / output.length)
    const biasedMax = Math.max(actualMax - 3 - averageBias, 1)
    const columns = Math.min(
      Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax),
      Math.floor((ctx.breakLength - ctx.indentationLvl) / actualMax),
      ctx.compact * 4,
      15,
    )
    if (columns <= 1) return output
    const maxLineLength: number[] = []
    for (let i = 0; i < columns; i++) {
      let lineLength = 0
      for (let j = i; j < output.length; j += columns) {
        if (dataLen[j] > lineLength) lineLength = dataLen[j]
      }
      maxLineLength.push(lineLength + separatorSpace)
    }
    // Numbers are right-aligned, anything else left-aligned.
    let padStart = true
    const items = value as Record<number, unknown>
    for (let i = 0; i < output.length; i++) {
      if (typeof items[i] !== 'number' && typeof items[i] !== 'bigint') {
        padStart = false
        break
      }
    }
    const grouped: string[] = []
    for (let i = 0; i < outputLength; i += columns) {
      const max = Math.min(i + columns, outputLength)
      let line = ''
      let j = i
      for (; j < max - 1; j++) {
        const cell = `${output[j]}, `
        line += padStart
          ? cell.padStart(maxLineLength[j - i])
          : cell.padEnd(maxLineLength[j - i])
      }
      line += padStart
        ? output[j].padStart(maxLineLength[j - i] - separatorSpace)
        : output[j]
      grouped.push(line)
    }
    if (ctx.maxArrayLength < output.length) grouped.push(output[outputLength])
    return grouped
  }
  return output
}

function reduceToSingleString(
  ctx: Context,
  output: string[],
  base: string,
  braces: [string, string],
  kind: Kind,
  recurseTimes: number,
  value: unknown,
) {
  const entries = output.length
  if (kind === ARRAY_EXTRAS && entries > 6) {
    output = groupArrayElements(ctx, output, value)
  }
  // Up to `compact` inner levels go on one line, if they fit within breakLength.
  if (
    ctx.currentDepth - recurseTimes < ctx.compact &&
    entries === output.length
  ) {
    const start =
      output.length + ctx.indentationLvl + braces[0].length + base.length + 10
    if (isBelowBreakLength(ctx, output, start, base)) {
      const joined = output.join(', ')
      if (!joined.includes('\n')) {
        return `${base ? `${base} ` : ''}${braces[0]} ${joined} ${braces[1]}`
      }
    }
  }
  const indentation = `\n${' '.repeat(ctx.indentationLvl)}`
  return `${base ? `${base} ` : ''}${braces[0]}${indentation}  ${output.join(`,${indentation}  `)}${indentation}${braces[1]}`
}

// --- util.format -------------------------------------------------------------------------------

const BUILTIN_TO_STRING = new Set<unknown>(
  [
    Object,
    Array,
    Error,
    Date,
    RegExp,
    Function,
    Map,
    Set,
    Promise,
    Number,
    String,
    Boolean,
  ].map((type) => type.prototype.toString),
)

/** `%s` prints objects with their own toString via String(), the rest via inspect. */
function hasBuiltInToString(value: object) {
  const { toString } = value as { toString?: unknown }
  return typeof toString !== 'function' || BUILTIN_TO_STRING.has(toString)
}

function tryStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch (err) {
    if (err instanceof TypeError && /circular/i.test(err.message))
      return '[Circular]'
    throw err
  }
}

/** util.format: printf-like placeholders (%s %d %i %f %j %o %O %c %%), then the rest inspected. */
export function format(...args: unknown[]) {
  const first = args[0]
  let a = 0
  let str = ''
  let join = ''
  if (typeof first === 'string') {
    if (args.length === 1) return first
    let lastPos = 0
    for (let i = 0; i < first.length - 1; i++) {
      if (first.charCodeAt(i) !== 37) continue // '%'
      const next = first[++i]
      if (a + 1 !== args.length) {
        let temp: string
        switch (next) {
          case 's': {
            const arg = args[++a]
            if (typeof arg === 'number') temp = formatNumber(arg)
            else if (typeof arg === 'bigint') temp = `${arg}n`
            else if (!isObject(arg) || !hasBuiltInToString(arg))
              temp = String(arg)
            else temp = inspect(arg, { depth: 0 })
            break
          }
          case 'j':
            temp = String(tryStringify(args[++a]))
            break
          case 'd': {
            const arg = args[++a]
            temp =
              typeof arg === 'bigint'
                ? `${arg}n`
                : typeof arg === 'symbol'
                  ? 'NaN'
                  : formatNumber(Number(arg))
            break
          }
          case 'O':
            temp = inspect(args[++a])
            break
          case 'o':
            temp = inspect(args[++a], { showHidden: true, depth: 4 })
            break
          case 'i': {
            const arg = args[++a]
            temp =
              typeof arg === 'bigint'
                ? `${arg}n`
                : typeof arg === 'symbol'
                  ? 'NaN'
                  : formatNumber(Number.parseInt(String(arg)))
            break
          }
          case 'f': {
            const arg = args[++a]
            temp =
              typeof arg === 'symbol'
                ? 'NaN'
                : formatNumber(Number.parseFloat(String(arg)))
            break
          }
          case 'c':
            a += 1
            temp = ''
            break
          case '%':
            str += first.slice(lastPos, i)
            lastPos = i + 1
            continue
          default:
            continue
        }
        if (lastPos !== i - 1) str += first.slice(lastPos, i - 1)
        str += temp
        lastPos = i + 1
      } else if (next === '%') {
        str += first.slice(lastPos, i)
        lastPos = i + 1
      }
    }
    if (lastPos !== 0) {
      a++
      join = ' '
      if (lastPos < first.length) str += first.slice(lastPos)
    }
  }
  while (a < args.length) {
    const value = args[a]
    str += join
    str += typeof value !== 'string' ? inspect(value) : value
    join = ' '
    a++
  }
  return str
}
