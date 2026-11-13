// Injected inline as the first <head> script of pure/ pages and React sandboxes.
// Mirrors console output and uncaught errors to the lab UI (the parent window).
// It's a classic script so it runs before any page code.
;(() => {
  if (window.parent === window) return

  const NOISE = /^\[vite\]|Download the React DevTools/

  const format = (value) => {
    if (typeof value === 'string') return value
    if (value instanceof Error) return value.stack || String(value)
    if (typeof value === 'function')
      return `[Function ${value.name || 'anonymous'}]`
    if (typeof value === 'bigint') return `${value}n`
    if (value === undefined) return 'undefined'
    if (typeof Node !== 'undefined' && value instanceof Node) {
      return (value.outerHTML || value.nodeName).slice(0, 300)
    }
    try {
      const seen = new WeakSet()
      return JSON.stringify(
        value,
        (_key, v) => {
          if (typeof v === 'bigint') return `${v}n`
          if (typeof v === 'function')
            return `[Function ${v.name || 'anonymous'}]`
          if (v instanceof Map) return Object.fromEntries(v)
          if (v instanceof Set) return [...v]
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[Circular]'
            seen.add(v)
          }
          return v
        },
        2,
      )
    } catch {
      return String(value)
    }
  }

  const post = (level, args) => {
    // Drop %c styling directives and their CSS arguments.
    if (typeof args[0] === 'string' && args[0].includes('%c')) {
      const styles = args[0].split('%c').length - 1
      args = [args[0].replaceAll('%c', ''), ...args.slice(1 + styles)]
    }
    const text = args.map(format).join(' ')
    if (NOISE.test(text)) return
    try {
      window.parent.postMessage(
        { source: 'quick-lab', level, text },
        location.origin,
      )
    } catch {
      // Parent gone or not same-origin: nothing to mirror to.
    }
  }

  post('reset', [])
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level]
    console[level] = (...args) => {
      post(level, args)
      original.apply(console, args)
    }
  }
  window.addEventListener('error', (e) => post('error', [e.error ?? e.message]))
  window.addEventListener('unhandledrejection', (e) =>
    post('error', ['Unhandled rejection:', e.reason]),
  )
})()
