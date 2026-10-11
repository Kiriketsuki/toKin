// Playwright runs the browser host end to end against the production build.
// The web server step builds build/web and serves it. Run: bun run test:web

import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'web/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `bun run web:build && bun scripts/serve-web.ts ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
