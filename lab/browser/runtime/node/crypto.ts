// node:crypto for the browser mode: what the Web Crypto API covers.
export const webcrypto = globalThis.crypto
export const subtle = webcrypto.subtle

export const randomUUID = () => webcrypto.randomUUID()

export const getRandomValues = webcrypto.getRandomValues.bind(webcrypto)

/** A uniformly distributed integer in [min, max). */
export function randomInt(min: number, max?: number) {
  if (max === undefined) {
    max = min
    min = 0
  }
  const range = max - min
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    range <= 0 ||
    range > 2 ** 32
  )
    throw new RangeError(
      `The value of "max" is out of range. It must be greater than the value of "min" (${min}).`,
    )
  // Rejection sampling avoids the modulo bias.
  const limit = 2 ** 32 - (2 ** 32 % range)
  const buffer = new Uint32Array(1)
  do webcrypto.getRandomValues(buffer)
  while (buffer[0] >= limit)
  return min + (buffer[0] % range)
}

export function createHash(): never {
  throw new Error(
    'crypto.createHash() não está disponível no navegador; use crypto.subtle.digest().',
  )
}

export default {
  webcrypto,
  subtle,
  randomUUID,
  getRandomValues,
  randomInt,
  createHash,
}
