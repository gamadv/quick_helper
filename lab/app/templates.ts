import type { Section } from '../shared.ts'

export const DEFAULT_EXTENSION: Record<Section, string> = {
  node: '.ts',
  pure: '.html',
  react: '.tsx',
}

/** Starter content for a file created from the sidebar. */
export function templateFor(file: string) {
  const name = file
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '')

  if (file.startsWith('react/') && file.endsWith('.tsx')) {
    // "meu-teste" -> "MeuTeste": a valid, capitalized component name.
    const component =
      name
        .replace(/(^|[^\p{L}\p{N}]+)([\p{L}\p{N}])/gu, (_, _sep, c: string) =>
          c.toUpperCase(),
        )
        .replace(/[^\p{L}\p{N}]/gu, '')
        .replace(/^(\d)/, 'Sandbox$1') || 'Sandbox'
    return `import { useState } from 'react'

export default function ${component}() {
  const [count, setCount] = useState(0)

  return (
    <main>
      <h1>${component}</h1>
      <button onClick={() => setCount((c) => c + 1)}>Cliques: {count}</button>
    </main>
  )
}
`
  }

  if (file.endsWith('.html')) {
    const title = name.replace(/[<>&]/g, '')
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>

    <script>
      console.log('Olá do HTML puro!')
    </script>
  </body>
</html>
`
  }

  if (file.startsWith('node/') && /\.(ts|mts|js|mjs)$/.test(file)) {
    return `console.log('Olá do Node', process.version)\n`
  }

  return ''
}
