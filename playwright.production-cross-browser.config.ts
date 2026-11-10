import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './e2e',

  testMatch: ['**/*.e2e.ts', '**/*.prod.ts'],

  fullyParallel: true,
  workers: 2,
  retries: 0,

  timeout: 45_000,

  expect: {
    timeout: 10_000,
  },

  reporter: 'list',

  outputDir:
    'node_modules/.cache/workflow-inspector-playwright-production-cross-browser',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-production-cross',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox-production-cross',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit-production-cross',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  webServer: {
    command:
      'npm run build && npm exec -- vite preview --host 127.0.0.1 --port 4175 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
