import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'backend-e2e',
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    // E2E hits a real Postgres; keep file isolation so parallel workers don't
    // race on the shared parceliq_test database.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
