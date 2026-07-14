import { defineConfig } from 'vitest/config'

/**
 * Root config so `yarn test` runs every workspace's tests in one pass.
 * Each project still owns its own `vite.config.ts`/`vitest.config.ts` (jsdom
 * environment, setup files, plugins) — this just aggregates them.
 */
export default defineConfig({
  test: {
    projects: [
      'packages/sdk/vitest.config.ts',
      'packages/ui/vitest.config.ts',
      'host-site/vite.config.ts',
      'iframe-app/vite.config.ts',
    ],
  },
})
