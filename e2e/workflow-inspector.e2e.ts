import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const emptyWorkflow = '{"nodes":[],"connections":{}}'

const mixedWorkflow = JSON.stringify({
  nodes: [
    {
      name: 'A',
      type: 'example.node',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    },
    {
      id: 'id-b',
      name: 'B',
      type: 'example.node',
      typeVersion: 1,
      position: [200, 0],
      parameters: {},
    },
  ],
  connections: {
    A: {
      main: [[{ node: 'B', type: 'main', index: 0 }]],
    },
    B: {
      main: [[{ node: 'A', type: 'main', index: 0 }]],
    },
  },
})

const blankNamesWorkflow = JSON.stringify({
  nodes: [
    {
      id: 'id-a',
      name: '',
      type: 'example.node',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    },
    {
      id: 'id-b',
      name: '',
      type: 'example.node',
      typeVersion: 1,
      position: [200, 0],
      parameters: {},
    },
  ],
  connections: {},
})

async function analyze(page: Page, raw: string) {
  await page.locator('#workflow-json').fill(raw)
  await page.getByRole('button', { name: 'Analyze JSON' }).click()
}

async function downloadReportText(page: Page) {
  const downloadPromise = page.waitForEvent('download')

  await page
    .getByRole('button', {
      name: 'Export JSON report',
    })
    .click()

  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('workflow-inspector-report.json')

  return readFile(await download.path(), 'utf8')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('shows the initial local-only form', async ({ page }) => {
  await expect(
    page.getByRole('heading', {
      name: 'Workflow Inspector',
    }),
  ).toBeVisible()

  await expect(page.locator('#workflow-json')).toBeVisible()
  await expect(page.locator('#workflow-json-file')).toBeAttached()

  await expect(
    page.getByRole('button', {
      name: 'Analyze JSON',
    }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)

  await expect(page.getByText('Finding details')).toHaveCount(0)
})

test('rejects an empty submission', async ({ page }) => {
  await page.getByRole('button', { name: 'Analyze JSON' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Paste a workflow JSON before analyzing.',
  )

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('audits an empty valid workflow', async ({ page }) => {
  await analyze(page, emptyWorkflow)

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await expect(page.locator('.wi-metrics strong')).toHaveText(['0', '0'])

  await expect(
    page.getByText('No findings were detected by the executed rules.'),
  ).toBeVisible()

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toBeVisible()
})

test('handles malformed JSON without results', async ({ page }) => {
  await analyze(page, '{"nodes":')

  await expect(
    page.getByRole('heading', {
      name: 'Audit could not be completed',
    }),
  ).toBeVisible()

  await expect(page.locator('.wi-finding-card')).toHaveCount(0)

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('renders real R07 and R09 findings', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  await expect(page.locator('.wi-metrics strong')).toHaveText(['2', '2'])

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R07', 'R09'])

  await expect(page.locator('.wi-finding-card')).toHaveCount(2)

  await expect(page.getByText('Showing 2 of 2 findings.')).toBeVisible()
})

test('filters findings by severity', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  const severity = page.getByRole('combobox', {
    name: 'Filter by severity',
  })

  await severity.selectOption('warning')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R09'])

  await expect(page.getByText('Showing 1 of 2 findings.')).toBeVisible()

  await severity.selectOption('info')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R07'])
})

test('combines severity and confidence filters', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  await page
    .getByRole('combobox', {
      name: 'Filter by severity',
    })
    .selectOption('warning')

  const confidence = page.getByRole('combobox', {
    name: 'Filter by confidence',
  })

  await confidence.selectOption('high')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R09'])

  await confidence.selectOption('medium')

  await expect(page.locator('.wi-finding-card')).toHaveCount(0)

  await expect(
    page.getByText('No findings match the current filters or search.'),
  ).toBeVisible()
})

test('searches by rule ID regardless of case and spaces', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  const search = page.getByRole('searchbox', {
    name: 'Search findings',
  })

  await search.fill('  r07  ')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R07'])

  await search.fill('r09')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R09'])

  await search.fill('')

  await expect(page.locator('.wi-finding-card')).toHaveCount(2)
})

test('groups findings after applying search', async ({ page }) => {
  await analyze(page, blankNamesWorkflow)

  const view = page.getByRole('combobox', {
    name: 'Results view',
  })

  await expect(view).toHaveValue('list')

  await view.selectOption('grouped')

  await expect(page.locator('.wi-finding-group-heading')).toHaveText([
    'R02 · 1 finding',
    'R10 · 2 findings',
  ])

  await expect(page.locator('.wi-finding-card')).toHaveCount(3)

  await page
    .getByRole('searchbox', {
      name: 'Search findings',
    })
    .fill('R10')

  await expect(page.locator('.wi-finding-group-heading')).toHaveText([
    'R10 · 2 findings',
  ])

  await expect(page.locator('.wi-finding-card')).toHaveCount(2)
})

test('imports local JSON without auditing automatically', async ({ page }) => {
  await page.locator('#workflow-json-file').setInputFiles({
    name: 'workflow.json',
    mimeType: 'application/json',
    buffer: Buffer.from(mixedWorkflow, 'utf8'),
  })

  await expect(page.locator('#workflow-json')).toHaveValue(mixedWorkflow)

  await expect(page.getByText(/File loaded/)).toBeVisible()

  await expect(page.locator('.wi-finding-card')).toHaveCount(0)

  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R07', 'R09'])
})

test('rejects an unsupported file while preserving text', async ({ page }) => {
  await page.locator('#workflow-json').fill(emptyWorkflow)

  await page.locator('#workflow-json-file').setInputFiles({
    name: 'workflow.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('{}', 'utf8'),
  })

  await expect(page.getByRole('alert')).toContainText(
    'Select a file with a .json extension.',
  )

  await expect(page.locator('#workflow-json')).toHaveValue(emptyWorkflow)
})

test('loads invalid JSON but rejects it during auditing', async ({ page }) => {
  await page.locator('#workflow-json-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nodes":', 'utf8'),
  })

  await expect(page.locator('#workflow-json')).toHaveValue('{"nodes":')

  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()

  await expect(
    page.getByRole('heading', {
      name: 'Audit could not be completed',
    }),
  ).toBeVisible()
})

test('exports the complete audit despite visual filters', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  await page
    .getByRole('combobox', {
      name: 'Filter by severity',
    })
    .selectOption('warning')

  await page
    .getByRole('combobox', {
      name: 'Filter by confidence',
    })
    .selectOption('high')

  await page
    .getByRole('searchbox', {
      name: 'Search findings',
    })
    .fill('R09')

  await page
    .getByRole('combobox', {
      name: 'Results view',
    })
    .selectOption('grouped')

  await expect(page.locator('.wi-finding-card')).toHaveCount(1)

  const content = await downloadReportText(page)

  const report = JSON.parse(content) as {
    formatVersion: number
    nodeCount: number
    findingCount: number
    findings: Array<{ ruleId: string }>
  }

  expect(report.formatVersion).toBe(1)
  expect(report.nodeCount).toBe(2)
  expect(report.findingCount).toBe(2)

  expect(report.findings.map((finding) => finding.ruleId)).toEqual([
    'R07',
    'R09',
  ])
})

test('does not export raw node data', async ({ page }) => {
  const secret = 'SENTINEL_PRIVATE_STAGE5'

  const raw = JSON.stringify({
    nodes: [
      {
        name: secret,
        type: 'example.node',
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          token: secret,
        },
      },
    ],
    connections: {},
  })

  await analyze(page, raw)

  const content = await downloadReportText(page)

  expect(content).toContain('"ruleId": "R09"')
  expect(content).not.toContain(secret)
  expect(content).not.toContain('"parameters"')
  expect(content).not.toContain('"token"')
})

test('clears previous results and resets controls after editing', async ({
  page,
}) => {
  await analyze(page, mixedWorkflow)

  await page
    .getByRole('combobox', {
      name: 'Filter by severity',
    })
    .selectOption('warning')

  await page
    .getByRole('combobox', {
      name: 'Filter by confidence',
    })
    .selectOption('high')

  await page
    .getByRole('searchbox', {
      name: 'Search findings',
    })
    .fill('R09')

  await page
    .getByRole('combobox', {
      name: 'Results view',
    })
    .selectOption('grouped')

  await page.locator('#workflow-json').fill(`${mixedWorkflow}\n`)

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)

  await expect(page.locator('.wi-finding-card')).toHaveCount(0)

  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()

  await expect(
    page.getByRole('combobox', {
      name: 'Filter by severity',
    }),
  ).toHaveValue('all')

  await expect(
    page.getByRole('combobox', {
      name: 'Filter by confidence',
    }),
  ).toHaveValue('all')

  await expect(
    page.getByRole('combobox', {
      name: 'Results view',
    }),
  ).toHaveValue('list')

  await expect(
    page.getByRole('searchbox', {
      name: 'Search findings',
    }),
  ).toHaveValue('')

  await expect(page.locator('.wi-finding-card')).toHaveCount(2)
})
