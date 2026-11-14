// Runs a node/ script in a module worker (browser mode), with Node's console, process and timers.
// Output and the exit status go to the lab as RunMessages. The service worker loads this from
// /vfs/__node/worker.js, so the worker is under its scope and imports of playground files (served
// and transpiled by it) work.
import type { RunMessage } from '../../shared.ts'
import { vfsUrl } from '../paths.ts'
import { createConsole } from './console.ts'
import { inspect, setStackFormatter } from './inspect.ts'

const startedAt = performance.now()
// The browser's own timers (typed as such: @types/node would make them return Timeout objects).
type SetTimer = (handler: () => void, ms?: number) => number
type ClearTimer = (id?: number) => void
const native = {
  setTimeout: globalThis.setTimeout.bind(globalThis) as unknown as SetTimer,
  clearTimeout: globalThis.clearTimeout.bind(
    globalThis,
  ) as unknown as ClearTimer,
  setInterval: globalThis.setInterval.bind(globalThis) as unknown as SetTimer,
  clearInterval: globalThis.clearInterval.bind(
    globalThis,
  ) as unknown as ClearTimer,
  fetch: globalThis.fetch.bind(globalThis),
}

// --- Output ------------------------------------------------------------------------------------
// Batched (at most one message per FLUSH_MS), so a script printing in a tight loop can't flood
// the lab with messages; past MAX_PENDING characters the oldest unsent output is dropped.

const FLUSH_MS = 30
const MAX_PENDING = 1_000_000
const KEEP_PENDING = 200_000
let pending: { type: 'stdout' | 'stderr'; data: string }[] = []
let pendingSize = 0
let lastFlush = 0
let flushTimer: number | undefined

const post = (message: RunMessage) => self.postMessage(message)

function flush() {
  native.clearTimeout(flushTimer)
  flushTimer = undefined
  lastFlush = performance.now()
  for (const message of pending) post(message)
  pending = []
  pendingSize = 0
}

function dropOldest() {
  while (pendingSize > KEEP_PENDING) {
    const first = pending[0]
    const excess = pendingSize - KEEP_PENDING
    if (first.data.length <= excess) {
      pending.shift()
      pendingSize -= first.data.length
    } else {
      first.data = first.data.slice(excess)
      pendingSize -= excess
    }
  }
}

function write(type: 'stdout' | 'stderr', data: string) {
  if (exited || !data) return
  activity++
  const last = pending.at(-1)
  if (last?.type === type) last.data += data
  else pending.push({ type, data })
  pendingSize += data.length
  if (pendingSize > MAX_PENDING) dropOldest()
  if (performance.now() - lastFlush >= FLUSH_MS) flush()
  else flushTimer ??= native.setTimeout(flush, FLUSH_MS)
}

// --- Lifetime ----------------------------------------------------------------------------------
// Like Node, the script ends when nothing is left to do: the main module has run and no timer
// (unless unref'd) or fetch is pending.

let mainDone = false
let exited = false
let pendingFetches = 0
let activity = 0 // bumped by anything that may schedule more work
const exitListeners: ((code: number) => void)[] = []

class ExitSignal extends Error {}

function exit(code: number) {
  if (exited) return
  for (const listener of exitListeners.splice(0)) {
    try {
      listener(code)
    } catch (err) {
      write('stderr', `${describeError(err)}\n`)
    }
  }
  flush()
  exited = true
  post({
    type: 'exit',
    code,
    signal: null,
    ms: Math.round(performance.now() - startedAt),
  })
  self.close()
}

const exitCode = () => Number(process.exitCode ?? 0) || 0

/** Exits once idle. Waits a moment first: untracked async work (e.g. crypto.subtle) may resume. */
function checkIdle() {
  if (!mainDone || exited || active.size > 0 || pendingFetches > 0) return
  const seen = activity
  native.setTimeout(() => {
    if (activity === seen && active.size === 0 && pendingFetches === 0)
      exit(exitCode())
    else checkIdle()
  }, 15)
}

// --- Timers: Node returns Timeout objects (ref/unref/refresh) that keep the process alive. -----

const active = new Set<Timeout>()
const byId = new Map<number, Timeout>()

class Timeout {
  #ref = true
  #cleared = false
  readonly #repeat: boolean
  readonly #start: () => number
  id: number

  constructor(repeat: boolean, start: () => number) {
    this.#repeat = repeat
    this.#start = start
    this.id = this.#arm()
  }
  #arm() {
    const id = this.#start()
    byId.set(id, this)
    if (this.#ref) active.add(this)
    activity++
    return id
  }
  #cancel() {
    if (this.#repeat) native.clearInterval(this.id)
    else native.clearTimeout(this.id)
  }
  /** The callback ran (one-shot timers): it no longer keeps the process alive. */
  fired() {
    byId.delete(this.id)
    active.delete(this)
  }
  ref() {
    this.#ref = true
    if (byId.get(this.id) === this) active.add(this)
    return this
  }
  unref() {
    this.#ref = false
    active.delete(this)
    checkIdle()
    return this
  }
  hasRef() {
    return this.#ref
  }
  /** Restarts the countdown (and re-arms a timer that already fired, like Node). */
  refresh() {
    if (this.#cleared) return this
    this.#cancel()
    byId.delete(this.id)
    this.id = this.#arm()
    return this
  }
  clear() {
    this.#cleared = true
    this.#cancel()
    this.fired()
    checkIdle()
  }
  [Symbol.toPrimitive]() {
    return this.id
  }
}

type Callback = (...args: unknown[]) => void

function callback(fn: unknown): Callback {
  if (typeof fn !== 'function')
    throw new TypeError(
      `The "callback" argument must be of type function. Received ${inspect(fn)}`,
    )
  return fn as Callback
}

function setTimeoutNode(fn: unknown, ms?: number, ...args: unknown[]) {
  const run = callback(fn)
  const timeout: Timeout = new Timeout(false, () =>
    native.setTimeout(() => {
      timeout.fired()
      try {
        run(...args)
      } finally {
        activity++
        checkIdle()
      }
    }, ms),
  )
  return timeout
}

function setIntervalNode(fn: unknown, ms?: number, ...args: unknown[]) {
  const run = callback(fn)
  return new Timeout(true, () =>
    native.setInterval(() => {
      activity++
      run(...args)
    }, ms),
  )
}

const setImmediateNode = (fn: unknown, ...args: unknown[]) =>
  setTimeoutNode(fn, 0, ...args)

function clearTimer(timer: unknown) {
  const timeout = timer instanceof Timeout ? timer : byId.get(Number(timer))
  timeout?.clear()
}

// fetch, plus reading the response body, keeps the script alive.
function track<T>(promise: Promise<T>): Promise<T> {
  pendingFetches++
  activity++
  return promise.finally(() => {
    pendingFetches--
    activity++
    checkIdle()
  })
}

for (const method of [
  'arrayBuffer',
  'blob',
  'bytes',
  'formData',
  'json',
  'text',
] as const) {
  const original = Response.prototype[method] as
    ((this: Response) => Promise<unknown>) | undefined
  if (!original) continue
  Object.defineProperty(Response.prototype, method, {
    configurable: true,
    writable: true,
    value(this: Response) {
      return track(original.call(this))
    },
  })
}

// --- process -----------------------------------------------------------------------------------

function hrtime(previous?: [number, number]) {
  const now = BigInt(Math.round(performance.now() * 1e6))
  let seconds = Number(now / 1_000_000_000n)
  let nanos = Number(now % 1_000_000_000n)
  if (previous) {
    seconds -= previous[0]
    nanos -= previous[1]
    if (nanos < 0) {
      seconds--
      nanos += 1e9
    }
  }
  return [seconds, nanos]
}

const stream = (type: 'stdout' | 'stderr') => ({
  isTTY: false,
  write(chunk: unknown, ...rest: unknown[]) {
    write(
      type,
      typeof chunk === 'string'
        ? chunk
        : new TextDecoder().decode(chunk as Uint8Array),
    )
    const done = rest.find((arg) => typeof arg === 'function') as
      (() => void) | undefined
    if (done) queueMicrotask(done)
    return true
  },
})

function createProcess(entry: string) {
  const proc = {
    title: 'node',
    version: 'v0.0.0-browser',
    versions: {} as Record<string, string>,
    platform: 'browser',
    arch: 'browser',
    pid: 1,
    ppid: 0,
    argv: ['node', `/${entry}`],
    argv0: 'node',
    execArgv: [] as string[],
    execPath: 'node',
    env: {} as Record<string, string | undefined>,
    exitCode: undefined as number | string | undefined,
    stdout: stream('stdout'),
    stderr: stream('stderr'),
    cwd: () => '/',
    chdir() {
      throw new Error('process.chdir() não está disponível no navegador.')
    },
    exit(code?: number | string): never {
      exit(Number(code ?? proc.exitCode ?? 0) || 0)
      throw new ExitSignal('process.exit()')
    },
    nextTick(fn: unknown, ...args: unknown[]) {
      const run = callback(fn)
      queueMicrotask(() => run(...args))
    },
    hrtime: Object.assign(hrtime, {
      bigint: () => BigInt(Math.round(performance.now() * 1e6)),
    }),
    uptime: () => performance.now() / 1000,
    memoryUsage: () => ({
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    }),
    emitWarning(warning: unknown) {
      const text =
        warning instanceof Error
          ? `${warning.name}: ${warning.message}`
          : String(warning)
      write('stderr', `(node:1) Warning: ${text}\n`)
    },
    on(event: string, listener: (code: number) => void) {
      if (event === 'exit') exitListeners.push(listener)
      return proc
    },
    once(event: string, listener: (code: number) => void) {
      return proc.on(event, listener)
    },
    off(event: string, listener: (code: number) => void) {
      const index = exitListeners.indexOf(listener)
      if (event === 'exit' && index !== -1) exitListeners.splice(index, 1)
      return proc
    },
    emit: () => false,
  }
  return proc
}

// --- Errors ------------------------------------------------------------------------------------

const ORIGIN = self.location.origin

/** Browser stack -> Node-like: "    at fn (node/index.ts:3:9)", without the lab's own frames. */
function formatStack(stack: string, error: Error) {
  let lines = stack.split('\n')
  // Firefox and Safari: "fn@url:line:col" and no "Name: message" header.
  const v8 = lines.some((line) => /^\s+at /.test(line))
  if (!v8 && lines.some((line) => /@.*:\d+:\d+$/.test(line))) {
    lines = [
      `${error.name}: ${error.message}`,
      ...lines.filter(Boolean).map((line) => {
        const at = line.lastIndexOf('@')
        const fn = line.slice(0, Math.max(at, 0))
        const where = line.slice(at + 1)
        return fn ? `    at ${fn} (${where})` : `    at ${where}`
      }),
    ]
  }
  return lines
    .filter(
      (line) =>
        !line.includes(`${ORIGIN}/runtime/`) &&
        !line.includes(`${ORIGIN}/assets/`),
    )
    .join('\n')
    .replaceAll(`${ORIGIN}/vfs/`, '')
    .replaceAll(`${ORIGIN}/`, '/')
    .replace(/(?<=['"(\s])\/vfs\//g, '')
}
setStackFormatter(formatStack)

const describeError = (error: unknown) =>
  error instanceof Error ? inspect(error) : `Uncaught ${inspect(error)}`

function uncaught(error: unknown) {
  if (error instanceof ExitSignal || exited) return
  write('stderr', `${describeError(error)}\n`)
  exit(1)
}

// --- Start -------------------------------------------------------------------------------------

let process: ReturnType<typeof createProcess>

async function start(entry: string) {
  process = createProcess(entry)
  Object.assign(globalThis, {
    console: createConsole(write),
    process,
    global: globalThis,
    setTimeout: setTimeoutNode,
    setInterval: setIntervalNode,
    setImmediate: setImmediateNode,
    clearTimeout: clearTimer,
    clearInterval: clearTimer,
    clearImmediate: clearTimer,
    fetch: (...args: Parameters<typeof fetch>) => track(native.fetch(...args)),
  })
  addEventListener('error', (event) => {
    event.preventDefault()
    uncaught(event.error ?? event.message)
  })
  addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    uncaught(event.reason)
  })
  try {
    await import(/* @vite-ignore */ vfsUrl(entry))
  } catch (error) {
    uncaught(error)
    return
  }
  mainDone = true
  checkIdle()
}

addEventListener(
  'message',
  (event: MessageEvent<{ entry: string }>) => void start(event.data.entry),
  { once: true },
)
