import { beforeAll, describe, expect, test } from 'vitest'
import {
  compile,
  importFailure,
  lexerReady,
  resolveImport,
  rewriteImports,
} from './transform.ts'

const files = new Set([
  'node/index.ts',
  'node/util.ts',
  'react/App.tsx',
  'react/Button.tsx',
  'react/hooks/index.ts',
  'react/styles.css',
  'react/data.json',
  'react/my file.tsx',
])

beforeAll(() => lexerReady())

describe('resolveImport', () => {
  test('relative files, with Vite-like extensions outside node/', () => {
    expect(resolveImport('./Button', 'react/App.tsx', files)).toBe(
      '/vfs/react/Button.tsx',
    )
    expect(resolveImport('./hooks', 'react/App.tsx', files)).toBe(
      '/vfs/react/hooks/index.ts',
    )
    expect(resolveImport('../App.js', 'react/hooks/index.ts', files)).toBe(
      '/vfs/react/App.tsx',
    )
    expect(resolveImport('/react/Button.tsx', 'pure/x.ts', files)).toBe(
      '/vfs/react/Button.tsx',
    )
    expect(resolveImport('./my file.tsx', 'react/App.tsx', files)).toBe(
      '/vfs/react/my%20file.tsx',
    )
  })

  test('node/ needs the exact file, like Node', () => {
    expect(resolveImport('./util.ts', 'node/index.ts', files)).toBe(
      '/vfs/node/util.ts',
    )
    expect(resolveImport('./util', 'node/index.ts', files)).toBe(
      '/vfs/__missing.js?specifier=.%2Futil&importer=node%2Findex.ts',
    )
  })

  test('non-JS files become modules', () => {
    expect(resolveImport('./styles.css', 'react/App.tsx', files)).toBe(
      '/vfs/react/styles.css?module',
    )
    expect(resolveImport('./data.json', 'react/App.tsx', files)).toBe(
      '/vfs/react/data.json?module',
    )
  })

  test('paths above the lab root are missing', () => {
    expect(resolveImport('../../x.ts', 'node/index.ts', files)).toMatch(
      /^\/vfs\/__missing\.js/,
    )
  })

  test('node built-ins: shims or a clear error', () => {
    expect(resolveImport('node:path', 'node/index.ts', files)).toBe(
      '/runtime/node/path.js',
    )
    expect(resolveImport('assert/strict', 'node/index.ts', files)).toBe(
      '/runtime/node/assert-strict.js',
    )
    expect(resolveImport('timers/promises', 'node/index.ts', files)).toBe(
      '/runtime/node/timers-promises.js',
    )
    expect(resolveImport('node:fs', 'node/index.ts', files)).toBe(
      '/vfs/__unsupported.js?module=fs&importer=node%2Findex.ts',
    )
    expect(resolveImport('fs/promises', 'node/index.ts', files)).toBe(
      '/vfs/__unsupported.js?module=fs%2Fpromises&importer=node%2Findex.ts',
    )
  })

  test('React uses the lab copy; other packages come from esm.sh', () => {
    expect(resolveImport('react', 'react/App.tsx', files)).toBe(
      '/runtime/react.js',
    )
    expect(resolveImport('react/jsx-runtime', 'react/App.tsx', files)).toBe(
      '/runtime/react-jsx-runtime.js',
    )
    expect(resolveImport('canvas-confetti', 'react/App.tsx', files)).toBe(
      'https://esm.sh/canvas-confetti?external=react,react-dom',
    )
    expect(resolveImport('lodash-es/chunk', 'node/index.ts', files)).toBe(
      'https://esm.sh/lodash-es/chunk',
    )
    expect(
      resolveImport('https://cdn.example.com/x.js', 'node/index.ts', files),
    ).toBe('https://cdn.example.com/x.js')
  })
})

describe('compile + rewriteImports', () => {
  test('TSX becomes JS with resolved imports, keeping line numbers', () => {
    const source = `import { useState, type FC } from 'react'
import Button from './Button'
import './styles.css'
export default function App(): JSX.Element {
  const [n] = useState<number>(0)
  return <Button label={String(n)} />
}
const lazy = () => import('./hooks')
const dynamic = (name: string) => import(\`./\${name}.tsx\`)
`
    const code = rewriteImports(
      compile('react/App.tsx', source),
      'react/App.tsx',
      files,
    )
    expect(code.split('\n')).toHaveLength(source.split('\n').length)
    expect(code).toContain('from "/runtime/react-jsx-runtime.js"')
    expect(code).toContain("from '/runtime/react.js'")
    expect(code).toContain("from '/vfs/react/Button.tsx'")
    expect(code).toContain("import '/vfs/react/styles.css?module'")
    expect(code).toContain('import("/vfs/react/hooks/index.ts")')
    expect(code).toContain('import(`./${name}.tsx`)')
    expect(code).not.toContain('useState<number>')
  })

  test('plain JS is only rewritten', () => {
    const source =
      "import { join } from 'node:path'\nconsole.log(join('a', 'b'))\n"
    expect(
      rewriteImports(compile('node/a.js', source), 'node/a.js', files),
    ).toBe(
      "import { join } from '/runtime/node/path.js'\nconsole.log(join('a', 'b'))\n",
    )
  })

  test('a static import that cannot load becomes a clear error, same line numbers', () => {
    const source =
      "import { a } from './util.ts'\nimport { x } from './nope.ts'\nimport { readFileSync } from 'node:fs'\nconsole.log(a, x)\n"
    const code = rewriteImports(source, 'node/index.ts', files)
    expect(code.split('\n')).toHaveLength(source.split('\n').length)
    expect(code).toMatch(
      /^throw Object\.assign\(new Error\("Cannot find module '\.\/nope\.ts' imported from node\/index\.ts"\)/,
    )
    expect(code).toContain("import { a } from '/vfs/node/util.ts'")
    expect(code).not.toContain("from './nope.ts'")
    expect(code).not.toContain('readFileSync }')
    // Dynamic imports keep the URL: that module throws when loaded.
    expect(rewriteImports("import('node:fs')", 'node/index.ts', files)).toBe(
      'import("/vfs/__unsupported.js?module=fs&importer=node%2Findex.ts")',
    )
  })

  test('importFailure describes failing URLs', () => {
    expect(
      importFailure(resolveImport('./nope', 'react/App.tsx', files)),
    ).toEqual({
      name: 'Error',
      header: 'Error [ERR_MODULE_NOT_FOUND]',
      message: "Cannot find module './nope' imported from react/App.tsx",
      at: 'react/App.tsx',
    })
    expect(importFailure('/runtime/node/path.js')).toBeUndefined()
  })

  test('syntax errors name the file and position', () => {
    expect(() => compile('node/index.ts', 'const x = <')).toThrow(
      /node\/index\.ts.*\(1:\d+\)/,
    )
  })
})
