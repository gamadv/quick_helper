import util from 'node:util'
import { describe, expect, test } from 'vitest'
import { format, inspect } from './inspect.ts'

class Foo {
  x = 1
  y = 'two'
}
class Bar extends Foo {}

const circular: Record<string, unknown> = { a: { b: { c: { d: 1 } } } }
circular.self = circular

const sparse = [, 1, , , 2]

// Node prints the same text as util.inspect for these; the port must match it exactly.
const SAMPLES: Record<string, unknown> = {
  string: 'hello',
  'string with quote': "it's",
  'string with both quotes': `say "it's"`,
  'string escapes': 'a\nb\tc\\d\u0001',
  'long multiline string': `${'line one is quite long '.repeat(4)}\n${'and the second one too '.repeat(4)}`,
  numbers: [0, -0, 1.5, NaN, Infinity, -Infinity],
  bigint: 10n,
  symbol: Symbol('s'),
  nullish: [null, undefined],
  booleans: [true, false],
  'empty object': {},
  'empty array': [],
  'flat object': { a: 1, b: 'x', c: true },
  'quoted keys': { 'a-b': 1, 'with space': 2, valid_key: 3, $dollar: 4 },
  'symbol key': { [Symbol('k')]: 2 },
  nested: { a: { b: { c: { d: { e: 1 } } } } },
  'nested arrays': [[1, [2, [3, [4, [5]]]]]],
  'wide object': {
    aaaaaaaaaa: 1111111111,
    bbbbbbbbbbbb: 'cccccccccccccccc',
    dddddddddd: [1, 2, 3],
    eeeeeeeeee: 'ffffffffffffffffff',
    g: 1,
  },
  'number grid': Array.from({ length: 30 }, (_, i) => i),
  'long array': Array.from({ length: 120 }, (_, i) => i % 3),
  'string grid': Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(97 + i).repeat((i % 4) + 1),
  ),
  'short strings': ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'g'],
  'array of objects': [
    { id: 1, name: 'Ana', tags: ['a', 'b'] },
    { id: 2, name: 'Bruno', tags: [] },
    { id: 3, name: 'Carla', tags: ['c'] },
  ],
  sparse,
  'array with extra key': Object.assign([1, 2], { extra: true }),
  map: new Map<unknown, unknown>([
    ['a', 1],
    [{ k: 1 }, [1, 2]],
  ]),
  'empty map': new Map(),
  set: new Set([1, 'x', { y: 2 }]),
  'big set': new Set(Array.from({ length: 30 }, (_, i) => i)),
  'class instance': new Foo(),
  'subclass instance': new Bar(),
  'null prototype': Object.assign(Object.create(null), { a: 1 }),
  'empty null prototype': Object.create(null),
  circular,
  functions: [
    function foo() {},
    () => {},
    async function bar() {},
    function* gen() {},
  ],
  classes: [Foo, Bar, class {}],
  'function with props': Object.assign(function withProps() {}, { a: 1 }),
  date: new Date(0),
  'invalid date': new Date(NaN),
  regexp: /x+/gi,
  'typed array': new Uint8Array([1, 2, 300]),
  'array buffer': new Uint8Array([1, 2]).buffer,
  'weak map': new WeakMap(),
  getters: {
    get g() {
      return 1
    },
    set s(_v: unknown) {},
    get gs() {
      return 1
    },
    set gs(_v: unknown) {},
  },
  'boxed primitives': [new Number(3), new String('ab'), new Boolean(false)],
  'error without stack': Object.assign(new Error('no stack'), {
    stack: undefined,
  }),
  'deep in array': [{ a: [{ b: { c: {} } }] }],
}

describe('inspect matches Node', () => {
  for (const [name, value] of Object.entries(SAMPLES)) {
    test(name, () => {
      expect(inspect(value)).toBe(util.inspect(value))
    })
  }

  test('depth option', () => {
    expect(inspect(SAMPLES.nested, { depth: 0 })).toBe(
      util.inspect(SAMPLES.nested, { depth: 0 }),
    )
    expect(inspect(SAMPLES.nested, { depth: null })).toBe(
      util.inspect(SAMPLES.nested, { depth: null }),
    )
  })

  test('errors keep their stack and own properties', () => {
    const error = Object.assign(new Error('boom'), { code: 'E_BOOM' })
    expect(inspect(error)).toBe(util.inspect(error))
    expect(inspect({ nested: error })).toBe(util.inspect({ nested: error }))
  })
})

describe('format matches Node', () => {
  const cases: unknown[][] = [
    ['plain'],
    ['%s has %d items', 'list', 3],
    ['%s', { a: [1, { b: 2 }] }],
    ['%s', Object.assign(Object.create(null), { a: 1 })],
    ['%s', { toString: () => 'custom' }],
    ['%i %f %j', '42.9px', '1.5', { a: [1] }],
    ['%o', { x: [1] }],
    ['%O', { x: [1] }],
    ['100%% done %c styled', 'color: red'],
    ['missing %s %s', 'one'],
    ['extra', { y: 2 }, 'args', 3],
    [{ a: 1 }, 'second'],
    [1n, Symbol('s'), null, undefined],
  ]
  for (const [i, args] of cases.entries()) {
    test(`case ${i}: ${typeof args[0] === 'string' ? args[0] : '(object first)'}`, () => {
      expect(format(...args)).toBe(util.format(...args))
    })
  }
})
