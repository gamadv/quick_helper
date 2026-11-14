// node:util for the browser mode.
import { format, inspect, type InspectOptions } from '../inspect.ts'
import { isDeepEqual } from './deep-equal.ts'

export { format, inspect }

export const formatWithOptions = (
  _options: InspectOptions,
  ...args: unknown[]
) => format(...args)

export const isDeepStrictEqual = (a: unknown, b: unknown) =>
  isDeepEqual(a, b, true)

type Callback = (error: unknown, ...values: unknown[]) => void
const PROMISIFY_CUSTOM = Symbol.for('nodejs.util.promisify.custom')

/** Wraps a callback-last function (err, value) into one that returns a promise. */
export const promisify = Object.assign(
  (fn: Function & { [PROMISIFY_CUSTOM]?: Function }) => {
    if (typeof fn[PROMISIFY_CUSTOM] === 'function') return fn[PROMISIFY_CUSTOM]
    return function (this: unknown, ...args: unknown[]) {
      return new Promise((resolve, reject) => {
        const done: Callback = (error, ...values) =>
          error ? reject(error) : resolve(values[0])
        fn.call(this, ...args, done)
      })
    }
  },
  { custom: PROMISIFY_CUSTOM },
)

export function callbackify(fn: (...args: unknown[]) => Promise<unknown>) {
  return function (this: unknown, ...args: unknown[]) {
    const done = args.pop() as Callback
    fn.apply(this, args).then(
      (value) => queueMicrotask(() => done(null, value)),
      (error) =>
        queueMicrotask(() =>
          done(error ?? new Error('Promise was rejected with a falsy value')),
        ),
    )
  }
}

export function inherits(ctor: Function, superCtor: Function) {
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype)
  Object.setPrototypeOf(ctor, superCtor)
}

export function deprecate<T extends Function>(fn: T, message: string): T {
  let warned = false
  return function (this: unknown, ...args: unknown[]) {
    if (!warned) {
      warned = true
      globalThis.process?.emitWarning(`DeprecationWarning: ${message}`)
    }
    return fn.apply(this, args)
  } as unknown as T
}

const tag = (value: unknown) =>
  Object.prototype.toString.call(value).slice(8, -1)

export const types = {
  isDate: (value: unknown) => value instanceof Date,
  isRegExp: (value: unknown) => value instanceof RegExp,
  isMap: (value: unknown) => value instanceof Map,
  isSet: (value: unknown) => value instanceof Set,
  isPromise: (value: unknown) => value instanceof Promise,
  isNativeError: (value: unknown) => value instanceof Error,
  isTypedArray: (value: unknown) =>
    ArrayBuffer.isView(value) && !(value instanceof DataView),
  isAsyncFunction: (value: unknown) =>
    typeof value === 'function' && tag(value).startsWith('Async'),
  isGeneratorFunction: (value: unknown) =>
    typeof value === 'function' && tag(value).includes('Generator'),
}

/** No colors in the lab: returns the text unchanged. */
export const styleText = (_format: string | string[], text: string) => text

export const stripVTControlCharacters = (text: string) =>
  text.replace(/\x1b\[[\d;]*[A-Za-z]/g, '')

export const isArray = Array.isArray
export const { TextEncoder, TextDecoder } = globalThis

export default {
  format,
  formatWithOptions,
  inspect,
  isDeepStrictEqual,
  promisify,
  callbackify,
  inherits,
  deprecate,
  types,
  styleText,
  stripVTControlCharacters,
  isArray,
  TextEncoder,
  TextDecoder,
}
