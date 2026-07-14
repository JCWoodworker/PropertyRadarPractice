import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'backend',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
  plugins: [
    // NestJS decorators need SWC metadata emission — Vite's default esbuild
    // strip would break DI in unit tests.
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
