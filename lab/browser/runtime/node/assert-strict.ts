// node:assert/strict
import { strict } from './assert.ts'

export default strict
export const {
  AssertionError,
  ok,
  equal,
  notEqual,
  strictEqual,
  notStrictEqual,
  deepEqual,
  notDeepEqual,
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
} = strict
export { strict }
