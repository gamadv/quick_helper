import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { labBuild } from './lab/build.ts'
import { lab } from './lab/plugin.ts'

export default defineConfig({
  // lab(): dev server backend (npm run dev). labBuild(): static, browser-only build (npm run build).
  plugins: [react(), lab(), labBuild()],
  // strictPort: fail if 5555 is taken instead of silently moving to another port.
  server: { port: 5555, strictPort: true, open: true },
  // Monaco alone is a few MB; the default 500 kB warning would always fire.
  build: { chunkSizeWarningLimit: 6000 },
  test: {
    include: ['{node,react,lab}/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
