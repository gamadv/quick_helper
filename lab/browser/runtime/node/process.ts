// node:process for the browser mode: the node worker's `process` global.
const proc = (globalThis.process ?? { env: {}, argv: [] }) as NodeJS.Process

export default proc
export const {
  argv,
  env,
  exit,
  nextTick,
  stdout,
  stderr,
  cwd,
  platform,
  version,
  versions,
  hrtime,
  memoryUsage,
  uptime,
  pid,
  arch,
  emitWarning,
  on,
  once,
  off,
} = proc
