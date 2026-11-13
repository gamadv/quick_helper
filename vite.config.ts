import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { lab } from './lab/plugin.ts'

export default defineConfig({
  plugins: [react(), lab()],
  // strictPort: fail if 5555 is taken instead of silently moving to another port.
  server: { port: 5555, strictPort: true, open: true },
  test: {
    include: ['{node,react}/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
