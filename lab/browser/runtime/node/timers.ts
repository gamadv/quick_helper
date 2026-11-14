// node:timers for the browser mode: the node worker's globals (Node-like Timeout objects).
import * as promises from './timers-promises.ts'

export const {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  setImmediate,
  clearImmediate,
} = globalThis

export { promises }

export default {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  setImmediate,
  clearImmediate,
  promises,
}
