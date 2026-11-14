import { describe, expect, test } from 'vitest'
import { groupFiles, normalizeLabPath } from './shared.ts'

describe('normalizeLabPath', () => {
  test('normalizes paths inside the playground folders', () => {
    expect(normalizeLabPath('node/index.ts')).toBe('node/index.ts')
    expect(normalizeLabPath('node/./a//b/../c.ts')).toBe('node/a/c.ts')
    expect(normalizeLabPath('node/../react/App.tsx')).toBe('react/App.tsx')
  })

  test('rejects anything else', () => {
    for (const path of [
      '',
      'node',
      'node/',
      '/node/index.ts',
      '../node/index.ts',
      'node/../../etc/passwd',
      'lab/plugin.ts',
      'node/.env',
      'node/.hidden/x.ts',
      'react/node_modules/x.js',
      'node/a\0.ts',
      null,
      undefined,
    ]) {
      expect(normalizeLabPath(path), String(path)).toBeUndefined()
    }
  })
})

test('groupFiles sorts by folder, then name', () => {
  expect(
    groupFiles([
      'react/b/x.tsx',
      'react/z.tsx',
      'node/b.ts',
      'node/a.ts',
      'react/a.tsx',
      'lab/x.ts',
    ]),
  ).toEqual({
    node: ['node/a.ts', 'node/b.ts'],
    pure: [],
    react: ['react/a.tsx', 'react/z.tsx', 'react/b/x.tsx'],
  })
})
