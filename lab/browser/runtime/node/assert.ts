// node:assert for the browser mode.
import { inspect } from '../inspect.ts'
import { isDeepEqual } from './deep-equal.ts'

type Message = string | Error | undefined

export class AssertionError extends Error {
  code = 'ERR_ASSERTION'
  actual: unknown
  expected: unknown
  operator: string | undefined
  generatedMessage: boolean

  constructor(options: {
    message?: string
    actual?: unknown
    expected?: unknown
    operator?: string
    generated?: boolean
  }) {
    super(options.message ?? 'Failed')
    this.name = 'AssertionError'
    this.actual = options.actual
    this.expected = options.expected
    this.operator = options.operator
    this.generatedMessage = options.generated ?? false
  }
}

function raise(
  actual: unknown,
  expected: unknown,
  message: Message,
  operator: string,
  generated: () => string,
): never {
  if (message instanceof Error) throw message
  throw new AssertionError({
    message: message ?? generated(),
    actual,
    expected,
    operator,
    generated: message === undefined,
  })
}

const diff = (actual: unknown, expected: unknown) => {
  const a = inspect(actual)
  const b = inspect(expected)
  if (!a.includes('\n') && !b.includes('\n') && a.length + b.length < 60)
    return `${a} !== ${b}\n`
  const prefix = (sign: string, text: string) =>
    text
      .split('\n')
      .map((line) => `${sign} ${line}`)
      .join('\n')
  return `+ actual - expected\n\n${prefix('+', a)}\n${prefix('-', b)}\n`
}

function ok(value: unknown, message?: Message) {
  if (!value)
    raise(value, true, message, '==', () =>
      arguments.length === 0
        ? 'No value argument passed to `assert.ok()`'
        : `The expression evaluated to a falsy value:\n\n  assert.ok(${inspect(value)})\n`,
    )
}

function equal(actual: unknown, expected: unknown, message?: Message) {
  if (!(actual == expected || (actual !== actual && expected !== expected)))
    raise(
      actual,
      expected,
      message,
      '==',
      () => `${inspect(actual)} == ${inspect(expected)}`,
    )
}

function notEqual(actual: unknown, expected: unknown, message?: Message) {
  if (actual == expected || (actual !== actual && expected !== expected))
    raise(
      actual,
      expected,
      message,
      '!=',
      () => `${inspect(actual)} != ${inspect(expected)}`,
    )
}

function strictEqual(actual: unknown, expected: unknown, message?: Message) {
  if (!Object.is(actual, expected))
    raise(
      actual,
      expected,
      message,
      'strictEqual',
      () =>
        `Expected values to be strictly equal:\n\n${diff(actual, expected)}`,
    )
}

function notStrictEqual(actual: unknown, expected: unknown, message?: Message) {
  if (Object.is(actual, expected))
    raise(
      actual,
      expected,
      message,
      'notStrictEqual',
      () => `Expected "actual" to be strictly unequal to: ${inspect(expected)}`,
    )
}

function deepEqual(actual: unknown, expected: unknown, message?: Message) {
  if (!isDeepEqual(actual, expected, false))
    raise(
      actual,
      expected,
      message,
      'deepEqual',
      () =>
        `Expected values to be loosely deep-equal:\n\n${inspect(actual)}\n\nshould loosely deep-equal\n\n${inspect(expected)}`,
    )
}

function notDeepEqual(actual: unknown, expected: unknown, message?: Message) {
  if (isDeepEqual(actual, expected, false))
    raise(
      actual,
      expected,
      message,
      'notDeepEqual',
      () =>
        `Expected "actual" not to be loosely deep-equal to: ${inspect(expected)}`,
    )
}

function deepStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: Message,
) {
  if (!isDeepEqual(actual, expected, true))
    raise(
      actual,
      expected,
      message,
      'deepStrictEqual',
      () =>
        `Expected values to be strictly deep-equal:\n${diff(actual, expected)}`,
    )
}

function notDeepStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: Message,
) {
  if (isDeepEqual(actual, expected, true))
    raise(
      actual,
      expected,
      message,
      'notDeepStrictEqual',
      () =>
        `Expected "actual" not to be strictly deep-equal to: ${inspect(expected)}`,
    )
}

type Expected = RegExp | Function | object | undefined

/** Checks a thrown error (or rejection) against a class, RegExp, validation function or object. */
function validate(
  error: unknown,
  expected: Expected,
  message: Message,
  kind: string,
) {
  if (expected === undefined) return
  if (expected instanceof RegExp) {
    if (!expected.test(String(error)))
      raise(
        error,
        expected,
        message,
        kind,
        () =>
          `The input did not match the regular expression ${inspect(expected)}. Input:\n\n${inspect(String(error))}\n`,
      )
    return
  }
  if (typeof expected === 'function') {
    if (expected.prototype !== undefined && error instanceof expected) return
    if (expected === Error || Error.isPrototypeOf(expected)) {
      raise(
        error,
        expected,
        message,
        kind,
        () =>
          `The error is expected to be an instance of "${expected.name}". Received "${(error as Error)?.constructor?.name}"`,
      )
    }
    const result: unknown = expected.call({}, error)
    if (result !== true)
      raise(
        error,
        expected,
        message,
        kind,
        () =>
          `The ${kind === 'rejects' ? 'rejection' : 'error'} validation function is expected to return "true". Received ${inspect(result)}`,
      )
    return
  }
  for (const key of Object.keys(expected)) {
    const want = (expected as Record<string, unknown>)[key]
    const got = (error as Record<string, unknown> | null)?.[key]
    const matches =
      want instanceof RegExp && typeof got === 'string'
        ? want.test(got)
        : isDeepEqual(got, want, true)
    if (!matches)
      raise(
        error,
        expected,
        message,
        kind,
        () => `Expected values to be strictly deep-equal:\n${diff(got, want)}`,
      )
  }
}

function throws(
  fn: () => unknown,
  expected?: Expected | string,
  message?: Message,
) {
  if (typeof expected === 'string') {
    message = expected
    expected = undefined
  }
  try {
    fn()
  } catch (error) {
    validate(error, expected, message, 'throws')
    return
  }
  raise(
    undefined,
    expected,
    message,
    'throws',
    () => 'Missing expected exception.',
  )
}

async function rejects(
  promise: Promise<unknown> | (() => Promise<unknown>),
  expected?: Expected | string,
  message?: Message,
) {
  if (typeof expected === 'string') {
    message = expected
    expected = undefined
  }
  try {
    await (typeof promise === 'function' ? promise() : promise)
  } catch (error) {
    validate(error, expected, message, 'rejects')
    return
  }
  raise(
    undefined,
    expected,
    message,
    'rejects',
    () => 'Missing expected rejection.',
  )
}

function doesNotThrow(fn: () => unknown, message?: Message) {
  try {
    fn()
  } catch (error) {
    raise(
      error,
      undefined,
      message,
      'doesNotThrow',
      () =>
        `Got unwanted exception.\nActual message: "${(error as Error)?.message}"`,
    )
  }
}

async function doesNotReject(
  promise: Promise<unknown> | (() => Promise<unknown>),
  message?: Message,
) {
  try {
    await (typeof promise === 'function' ? promise() : promise)
  } catch (error) {
    raise(
      error,
      undefined,
      message,
      'doesNotReject',
      () =>
        `Got unwanted rejection.\nActual message: "${(error as Error)?.message}"`,
    )
  }
}

function match(value: string, regexp: RegExp, message?: Message) {
  if (!regexp.test(value))
    raise(
      value,
      regexp,
      message,
      'match',
      () =>
        `The input did not match the regular expression ${inspect(regexp)}. Input:\n\n${inspect(value)}\n`,
    )
}

function doesNotMatch(value: string, regexp: RegExp, message?: Message) {
  if (regexp.test(value))
    raise(
      value,
      regexp,
      message,
      'doesNotMatch',
      () =>
        `The input was expected to not match the regular expression ${inspect(regexp)}. Input:\n\n${inspect(value)}\n`,
    )
}

function ifError(value: unknown) {
  if (value !== null && value !== undefined)
    raise(
      value,
      null,
      undefined,
      'ifError',
      () =>
        `ifError got unwanted exception: ${value instanceof Error ? value.message : inspect(value)}`,
    )
}

function fail(message: Message = 'Failed'): never {
  if (message instanceof Error) throw message
  throw new AssertionError({ message, operator: 'fail' })
}

const common = {
  AssertionError,
  ok,
  strictEqual,
  notStrictEqual,
  deepStrictEqual,
  notDeepStrictEqual,
  throws,
  rejects,
  doesNotThrow,
  doesNotReject,
  match,
  doesNotMatch,
  ifError,
  fail,
}

/** assert.strict: equal/deepEqual are the strict versions. */
export const strict = Object.assign(
  (value: unknown, message?: Message) => ok(value, message),
  {
    ...common,
    equal: strictEqual,
    notEqual: notStrictEqual,
    deepEqual: deepStrictEqual,
    notDeepEqual: notDeepStrictEqual,
    strict: undefined as unknown,
  },
)
strict.strict = strict

const assert = Object.assign(
  (value: unknown, message?: Message) => ok(value, message),
  {
    ...common,
    equal,
    notEqual,
    deepEqual,
    notDeepEqual,
    strict,
  },
)

export default assert
export {
  deepEqual,
  deepStrictEqual,
  doesNotMatch,
  doesNotReject,
  doesNotThrow,
  equal,
  fail,
  ifError,
  match,
  notDeepEqual,
  notDeepStrictEqual,
  notEqual,
  notStrictEqual,
  ok,
  rejects,
  strictEqual,
  throws,
}
