// node:events for the browser mode.
import { inspect } from '../inspect.ts'

type Listener = (...args: any[]) => unknown
type Wrapped = Listener & { listener?: Listener }
type Name = string | symbol

export const errorMonitor = Symbol('events.errorMonitor')

export class EventEmitter {
  static defaultMaxListeners = 10
  static readonly errorMonitor = errorMonitor
  static EventEmitter = EventEmitter
  static once = once

  #events = new Map<Name, Wrapped[]>()
  #maxListeners = EventEmitter.defaultMaxListeners

  #add(name: Name, listener: Listener, prepend: boolean) {
    if (typeof listener !== 'function')
      throw new TypeError(
        `The "listener" argument must be of type function. Received ${inspect(listener)}`,
      )
    if (this.#events.has('newListener'))
      this.emit('newListener', name, (listener as Wrapped).listener ?? listener)
    const list = this.#events.get(name) ?? []
    if (prepend) list.unshift(listener)
    else list.push(listener)
    this.#events.set(name, list)
    if (this.#maxListeners > 0 && list.length === this.#maxListeners + 1) {
      globalThis.process?.emitWarning(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${list.length} ${String(name)} listeners added. Use emitter.setMaxListeners() to increase limit`,
      )
    }
    return this
  }

  #onceWrapper(name: Name, listener: Listener) {
    const wrapped: Wrapped = (...args: unknown[]) => {
      this.removeListener(name, wrapped)
      return listener.apply(this, args)
    }
    wrapped.listener = listener
    return wrapped
  }

  on(name: Name, listener: Listener) {
    return this.#add(name, listener, false)
  }
  addListener(name: Name, listener: Listener) {
    return this.#add(name, listener, false)
  }
  prependListener(name: Name, listener: Listener) {
    return this.#add(name, listener, true)
  }
  once(name: Name, listener: Listener) {
    return this.#add(name, this.#onceWrapper(name, listener), false)
  }
  prependOnceListener(name: Name, listener: Listener) {
    return this.#add(name, this.#onceWrapper(name, listener), true)
  }

  removeListener(name: Name, listener: Listener) {
    const list = this.#events.get(name)
    if (!list) return this
    const index = list.findLastIndex(
      (l) => l === listener || l.listener === listener,
    )
    if (index === -1) return this
    const [removed] = list.splice(index, 1)
    if (list.length === 0) this.#events.delete(name)
    if (this.#events.has('removeListener'))
      this.emit('removeListener', name, removed.listener ?? removed)
    return this
  }
  off(name: Name, listener: Listener) {
    return this.removeListener(name, listener)
  }

  removeAllListeners(name?: Name) {
    if (name === undefined) this.#events.clear()
    else this.#events.delete(name)
    return this
  }

  emit(name: Name, ...args: unknown[]): boolean {
    if (name === 'error') {
      for (const monitor of [...(this.#events.get(errorMonitor) ?? [])])
        monitor.apply(this, args)
      if (!this.#events.has('error')) {
        const error = args[0]
        if (error instanceof Error) throw error
        throw new Error(`Unhandled error. (${inspect(error)})`)
      }
    }
    const list = this.#events.get(name)
    if (!list) return false
    for (const listener of [...list]) listener.apply(this, args)
    return true
  }

  listeners(name: Name) {
    return (this.#events.get(name) ?? []).map((l) => l.listener ?? l)
  }
  rawListeners(name: Name) {
    return [...(this.#events.get(name) ?? [])]
  }
  listenerCount(name: Name) {
    return this.#events.get(name)?.length ?? 0
  }
  eventNames() {
    return [...this.#events.keys()]
  }
  setMaxListeners(n: number) {
    this.#maxListeners = n
    return this
  }
  getMaxListeners() {
    return this.#maxListeners
  }
}

/** Resolves with the arguments of the next `name` event (rejects on 'error'). */
export function once(
  emitter: EventEmitter,
  name: Name,
  options: { signal?: AbortSignal } = {},
) {
  return new Promise<unknown[]>((resolve, reject) => {
    const { signal } = options
    const cleanup = () => {
      emitter.removeListener(name, onEvent)
      emitter.removeListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }
    const onEvent = (...args: unknown[]) => {
      cleanup()
      resolve(args)
    }
    const onError = (error: unknown) => {
      cleanup()
      reject(error)
    }
    const onAbort = () => {
      cleanup()
      reject(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
          code: 'ABORT_ERR',
        }),
      )
    }
    if (signal?.aborted) return onAbort()
    emitter.once(name, onEvent)
    if (name !== 'error') emitter.once('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export default EventEmitter
