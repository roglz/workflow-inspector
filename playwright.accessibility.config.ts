import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5176'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.a11y.ts',

  fullyParallel: true,
  workers: 2,
  retries: 0,

  timeout: 45_000,

  expect: {
    timeout: 10_000,
  },

  reporter: 'list',

  outputDir: 'node_modules/.cache/workflow-inspector-playwright-accessibility',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-accessibility',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 45_000,
  },
})
