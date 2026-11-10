import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './e2e',

  testMatch: ['**/*.e2e.ts', '**/*.prod.ts'],

  fullyParallel: true,
  workers: 2,

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  reporter: 'list',

  outputDir: 'node_modules/.cache/workflow-inspector-playwright-production',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-production',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command:
      'npm run build && npm exec -- vite preview --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
