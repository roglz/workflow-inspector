import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4176'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.robust.ts',

  fullyParallel: true,
  workers: 2,
  retries: 0,

  timeout: 60_000,

  expect: {
    timeout: 15_000,
  },

  reporter: 'list',

  outputDir: 'node_modules/.cache/workflow-inspector-playwright-robustness',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-robustness',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command:
      'npm run build && npm exec -- vite preview --host 127.0.0.1 --port 4176 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
