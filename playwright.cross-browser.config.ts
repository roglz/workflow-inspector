import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5175'

export default defineConfig({
  testDir: './e2e',

  testMatch: ['**/*.e2e.ts', '**/*.cross.ts'],

  fullyParallel: true,
  workers: 2,
  retries: 0,

  timeout: 45_000,

  expect: {
    timeout: 10_000,
  },

  reporter: 'list',

  outputDir: 'node_modules/.cache/workflow-inspector-playwright-cross-browser',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-cross',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox-cross',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit-cross',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 45_000,
  },
})
