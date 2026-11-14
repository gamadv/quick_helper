// Deep equality for node:assert and util.isDeepStrictEqual (strict: Object.is and prototypes;
// loose: == for primitives).

const ownKeys = (value: object, strict: boolean) => {
  const keys: PropertyKey[] = Object.keys(value)
  if (strict) {
    for (const symbol of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, symbol))
        keys.push(symbol)
    }
  }
  return keys
}

const tag = (value: object) => Object.prototype.toString.call(value)

export function isDeepEqual(
  a: unknown,
  b: unknown,
  strict: boolean,
  memo = new Map<object, object>(),
): boolean {
  if (strict ? Object.is(a, b) : a == b || (a !== a && b !== b)) return true
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false
  }
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false
  if (tag(a) !== tag(b) || Array.isArray(a) !== Array.isArray(b)) return false

  if (a instanceof Date && b instanceof Date) {
    if (a.getTime() !== b.getTime()) return false
  } else if (a instanceof RegExp && b instanceof RegExp) {
    if (String(a) !== String(b) || a.lastIndex !== b.lastIndex) return false
  } else if (a instanceof Error && b instanceof Error) {
    if (a.message !== b.message || a.name !== b.name) return false
  } else if (
    a instanceof Number ||
    a instanceof String ||
    a instanceof Boolean
  ) {
    if (!Object.is(a.valueOf(), (b as Number).valueOf())) return false
  } else if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
    const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
    if (x.length !== y.length || x.some((byte, i) => byte !== y[i]))
      return false
  }

  // Cycles: assume equal while comparing the same pair further up.
  if (memo.get(a) === b) return true
  memo.set(a, b)

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false
    for (const [key, value] of a) {
      if (b.has(key)) {
        if (!isDeepEqual(value, b.get(key), strict, memo)) return false
      } else if (typeof key !== 'object' || key === null) {
        return false
      } else if (
        ![...b].some(
          ([otherKey, otherValue]) =>
            isDeepEqual(key, otherKey, strict, memo) &&
            isDeepEqual(value, otherValue, strict, memo),
        )
      ) {
        return false
      }
    }
  } else if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false
    for (const value of a) {
      if (b.has(value)) continue
      if (typeof value !== 'object' || value === null) return false
      if (![...b].some((other) => isDeepEqual(value, other, strict, memo)))
        return false
    }
  }

  const keysA = ownKeys(a, strict)
  const keysB = ownKeys(b, strict)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!Object.prototype.propertyIsEnumerable.call(b, key)) return false
    const x = (a as Record<PropertyKey, unknown>)[key]
    const y = (b as Record<PropertyKey, unknown>)[key]
    if (!isDeepEqual(x, y, strict, memo)) return false
  }
  return true
}
