// Node's console for the node worker: same text as Node (util.format, console.table...), written
// to stdout/stderr instead of the browser devtools.
import { format, inspect, type InspectOptions } from './inspect.ts'

type Write = (stream: 'stdout' | 'stderr', text: string) => void

/** Node's console.table layout (lib/internal/cli_table.js). */
function renderTable(head: string[], columns: string[][]) {
  const widths = head.map((h) => h.length)
  const longest = Math.max(...columns.map((column) => column.length))
  const rows: string[][] = []
  head.forEach((_, i) => {
    for (let j = 0; j < longest; j++) {
      rows[j] ??= []
      const cell = (rows[j][i] = Object.hasOwn(columns[i], j)
        ? columns[i][j]
        : '')
      widths[i] = Math.max(widths[i], cell.length)
    }
  })
  const row = (cells: string[]) =>
    `│ ${cells.map((cell, i) => cell.padEnd(widths[i])).join(' │ ')} │`
  const divider = widths.map((w) => '─'.repeat(w + 2))
  return [
    `┌${divider.join('┬')}┐`,
    row(head),
    `├${divider.join('┼')}┤`,
    ...rows.map(row),
    `└${divider.join('┴')}┘`,
  ].join('\n')
}

function table(data: unknown, properties?: string[]) {
  if (data === null || typeof data !== 'object') return undefined
  const show = (value: unknown) => {
    const depth =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 2
        ? -1
        : 0
    return inspect(value, { depth, maxArrayLength: 3, breakLength: Infinity })
  }
  const indexes = (length: number) => Array.from({ length }, (_, i) => show(i))

  if (data instanceof Map) {
    const keys: string[] = []
    const values: string[] = []
    for (const [key, value] of data) {
      keys.push(show(key))
      values.push(show(value))
    }
    return renderTable(
      ['(iteration index)', 'Key', 'Values'],
      [indexes(keys.length), keys, values],
    )
  }
  if (data instanceof Set) {
    const values = [...data].map(show)
    return renderTable(
      ['(iteration index)', 'Values'],
      [indexes(values.length), values],
    )
  }

  const map: Record<string, string[]> = Object.create(null)
  let hasPrimitives = false
  const primitives: string[] = []
  const indexKeys = Object.keys(data)
  indexKeys.forEach((index, i) => {
    const item = (data as Record<string, unknown>)[index]
    const primitive =
      item === null || (typeof item !== 'function' && typeof item !== 'object')
    if (properties === undefined && primitive) {
      hasPrimitives = true
      primitives[i] = show(item)
    } else {
      for (const key of properties ?? Object.keys(item as object)) {
        map[key] ??= []
        map[key][i] =
          (primitive && properties) || !Object.hasOwn(item as object, key)
            ? ''
            : show((item as Record<string, unknown>)[key])
      }
    }
  })
  const head = Object.keys(map)
  const columns = Object.values(map)
  if (hasPrimitives) {
    head.push('Values')
    columns.push(primitives)
  }
  return renderTable(['(index)', ...head], [indexKeys, ...columns])
}

/** console.time format: 1.234ms, 1.234s, 1:02.345 (m:ss.mmm), 1:02:03.456 (h:mm:ss.mmm). */
function formatTime(ms: number) {
  let hours = 0
  let minutes = 0
  let seconds = 0
  if (ms >= 1000) {
    if (ms >= 60_000) {
      if (ms >= 3_600_000) {
        hours = Math.floor(ms / 3_600_000)
        ms -= hours * 3_600_000
      }
      minutes = Math.floor(ms / 60_000)
      ms -= minutes * 60_000
    }
    seconds = ms / 1000
  }
  if (hours !== 0 || minutes !== 0) {
    const [whole, fraction] = seconds.toFixed(3).split('.')
    const res =
      hours !== 0
        ? `${hours}:${String(minutes).padStart(2, '0')}`
        : `${minutes}`
    return `${res}:${whole.padStart(2, '0')}.${fraction} (${hours !== 0 ? 'h:m' : ''}m:ss.mmm)`
  }
  if (seconds !== 0) return `${seconds.toFixed(3)}s`
  return `${Number(ms.toFixed(3))}ms`
}

export function createConsole(write: Write) {
  let indent = ''
  const counts = new Map<string, number>()
  const timers = new Map<string, number>()

  const print = (stream: 'stdout' | 'stderr', text: string) => {
    const body = indent ? indent + text.replaceAll('\n', `\n${indent}`) : text
    write(stream, `${body}\n`)
  }
  const log = (...args: unknown[]) => print('stdout', format(...args))
  const error = (...args: unknown[]) => print('stderr', format(...args))

  const timeLog = (label: string, end: boolean, data: unknown[]) => {
    const start = timers.get(label)
    if (start === undefined) {
      process.emitWarning(
        `No such label '${label}' for console.time${end ? 'End' : 'Log'}()`,
      )
      return
    }
    if (end) timers.delete(label)
    const text = `${label}: ${formatTime(performance.now() - start)}`
    log(...(data.length ? [text, ...data] : [text]))
  }

  return {
    log,
    info: log,
    debug: log,
    error,
    warn: error,
    dir: (value: unknown, options?: InspectOptions) =>
      print('stdout', inspect(value, options)),
    dirxml: log,
    trace(...args: unknown[]) {
      const stack = new Error().stack?.split('\n').slice(2).join('\n') ?? ''
      print(
        'stderr',
        `Trace${args.length ? `: ${format(...args)}` : ''}\n${stack}`,
      )
    },
    assert(condition?: unknown, ...args: unknown[]) {
      if (condition) return
      if (typeof args[0] === 'string') args[0] = `Assertion failed: ${args[0]}`
      else args.unshift('Assertion failed')
      error(...args)
    },
    table(data: unknown, properties?: string[]) {
      const rendered = table(data, properties)
      if (rendered === undefined) log(data)
      else print('stdout', rendered)
    },
    group(...label: unknown[]) {
      if (label.length) log(...label)
      indent += '  '
    },
    groupCollapsed(...label: unknown[]) {
      if (label.length) log(...label)
      indent += '  '
    },
    groupEnd() {
      indent = indent.slice(2)
    },
    count(label = 'default') {
      const count = (counts.get(`${label}`) ?? 0) + 1
      counts.set(`${label}`, count)
      log(`${label}: ${count}`)
    },
    countReset(label = 'default') {
      counts.delete(`${label}`)
    },
    time(label = 'default') {
      if (timers.has(`${label}`)) {
        process.emitWarning(
          `Label '${label}' already exists for console.time()`,
        )
        return
      }
      timers.set(`${label}`, performance.now())
    },
    timeLog: (label = 'default', ...data: unknown[]) =>
      timeLog(`${label}`, false, data),
    timeEnd: (label = 'default') => timeLog(`${label}`, true, []),
    clear() {},
  }
}
