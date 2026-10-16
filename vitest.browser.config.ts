import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

import { hostAliases, poiHostResolver } from './preview/aliases'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Browser project for the Storybook stories. Deliberately separate from
// vite.config.ts so it never inherits the Node jsdom test setup (tests/setup.ts).
export default defineConfig({
  plugins: [poiHostResolver()],
  resolve: {
    alias: hostAliases,
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          // Vitest 5 uses `test.api` for the browser orchestration server.
          // Its default port (63315) sits in a Windows-reserved range, so pin
          // a free IPv4 loopback port instead.
          api: {
            host: '127.0.0.1',
            port: 5174,
          },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
            // Keep the Chromium failure diagnostics that CI uploads: on failure
            // Vitest writes a PNG to `.vitest/attachments/failure-screenshots/`
            // and retains a Playwright trace. Traces must not default to
            // `stories/__traces__`: that directory name contains a `.stories.tsx`
            // segment which Storybook then tries to index as a story module.
            screenshotFailures: true,
            trace: {
              mode: 'retain-on-failure',
              tracesDir: path.join(dirname, '.vitest/traces'),
            },
          },
        },
      },
    ],
  },
})
