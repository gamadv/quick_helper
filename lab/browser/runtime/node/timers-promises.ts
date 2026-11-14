// node:timers/promises for the browser mode (built on the node worker's tracked timers).

type Options = { signal?: AbortSignal; ref?: boolean }
type Timer = { unref?: () => void }

const abortError = (signal: AbortSignal) =>
  Object.assign(new Error('The operation was aborted'), {
    name: 'AbortError',
    code: 'ABORT_ERR',
    cause: signal.reason,
  })

function setTimeoutPromise<T = void>(
  ms?: number,
  value?: T,
  options: Options = {},
) {
  return new Promise<T>((resolve, reject) => {
    const { signal } = options
    if (signal?.aborted) return reject(abortError(signal))
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError(signal!))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve(value as T)
    }, ms)
    if (options.ref === false) (timer as Timer).unref?.()
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export { setTimeoutPromise as setTimeout }

export const setImmediate = <T = void>(value?: T, options?: Options) =>
  setTimeoutPromise(0, value, options)

/** An async iterator that yields `value` every `ms` milliseconds. */
export async function* setInterval<T = void>(
  ms?: number,
  value?: T,
  options: Options = {},
) {
  const { signal } = options
  let ticks = 0
  let wake: (() => void) | undefined
  const timer = globalThis.setInterval(() => {
    ticks++
    wake?.()
  }, ms)
  if (options.ref === false) (timer as Timer).unref?.()
  const onAbort = () => wake?.()
  signal?.addEventListener('abort', onAbort)
  try {
    for (;;) {
      if (signal?.aborted) throw abortError(signal)
      if (ticks === 0) await new Promise<void>((resolve) => (wake = resolve))
      wake = undefined
      if (signal?.aborted) throw abortError(signal)
      for (; ticks > 0; ticks--) yield value as T
    }
  } finally {
    clearInterval(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const scheduler = {
  wait: (ms: number, options?: Options) =>
    setTimeoutPromise(ms, undefined, options),
  yield: () => setImmediate(),
}

export default {
  setTimeout: setTimeoutPromise,
  setImmediate,
  setInterval,
  scheduler,
}
