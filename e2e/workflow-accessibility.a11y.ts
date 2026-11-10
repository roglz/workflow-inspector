import AxeBuilder from '@axe-core/playwright'
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

const groupedWorkflow = JSON.stringify({
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

async function expectNoWcagViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    targets: violation.nodes.map((node) => node.target),
  }))

  expect(violations).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('initial form has no automated WCAG A/AA violations', async ({ page }) => {
  await expect(
    page.getByRole('heading', {
      name: 'Workflow Inspector',
    }),
  ).toBeVisible()

  await expectNoWcagViolations(page)
})

test('empty successful audit has no automated WCAG violations', async ({
  page,
}) => {
  await analyze(page, emptyWorkflow)

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await expectNoWcagViolations(page)
})

test('invalid JSON feedback has no automated WCAG violations', async ({
  page,
}) => {
  await analyze(page, '{"nodes":')

  await expect(
    page.getByRole('heading', {
      name: 'Audit could not be completed',
    }),
  ).toBeVisible()

  await expectNoWcagViolations(page)
})

test('findings and filters have no automated WCAG violations', async ({
  page,
}) => {
  await analyze(page, mixedWorkflow)

  await expect(page.locator('.wi-finding-card')).toHaveCount(2)

  await expectNoWcagViolations(page)
})

test('grouped findings have no automated WCAG violations', async ({ page }) => {
  await analyze(page, groupedWorkflow)

  await page
    .getByRole('combobox', {
      name: 'Results view',
    })
    .selectOption('grouped')

  await expect(page.locator('.wi-finding-group')).toHaveCount(2)

  await expectNoWcagViolations(page)
})

test('exposes one main landmark and one primary heading', async ({ page }) => {
  await expect(page.getByRole('main')).toHaveCount(1)

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Workflow Inspector',
    }),
  ).toHaveCount(1)

  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Analyze workflow',
    }),
  ).toHaveCount(1)
})

test('declares English as the document language', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('provides accessible labels for both JSON input methods', async ({
  page,
}) => {
  await expect(
    page.getByRole('textbox', {
      name: 'Workflow JSON',
    }),
  ).toBeVisible()

  await expect(page.getByLabel('Or select a JSON file')).toBeAttached()

  await expect(page.locator('#workflow-json')).toHaveAttribute(
    'aria-describedby',
    'workflow-json-help',
  )
})

test('follows the expected initial keyboard tab order', async ({ page }) => {
  await page.keyboard.press('Tab')

  await expect(page.locator('#workflow-json')).toBeFocused()

  await page.keyboard.press('Tab')

  await expect(page.locator('#workflow-json-file')).toBeFocused()

  await page.keyboard.press('Tab')

  await expect(
    page.getByRole('button', {
      name: 'Analyze JSON',
    }),
  ).toBeFocused()
})

test('submits an audit using the Enter key', async ({ page }) => {
  await page.locator('#workflow-json').fill(emptyWorkflow)

  const submit = page.getByRole('button', {
    name: 'Analyze JSON',
  })

  await submit.focus()
  await page.keyboard.press('Enter')

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()
})

test('changes severity filtering using the keyboard', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  const severity = page.getByRole('combobox', {
    name: 'Filter by severity',
  })

  await severity.focus()

  // all -> error -> warning
  await severity.press('ArrowDown')
  await severity.press('ArrowDown')

  await expect(severity).toHaveValue('warning')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R09'])
})

test('searches findings using the keyboard', async ({ page }) => {
  await analyze(page, mixedWorkflow)

  const search = page.getByRole('searchbox', {
    name: 'Search findings',
  })

  await search.focus()
  await page.keyboard.type('r09')

  await expect(search).toHaveValue('r09')

  await expect(page.locator('.wi-finding-rule')).toHaveText(['R09'])
})

test('exposes empty submission feedback as an alert', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()

  await expect(page.getByRole('alert')).toContainText(
    'Paste a workflow JSON before analyzing.',
  )

  await page.locator('#workflow-json').fill(emptyWorkflow)

  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('exposes parser failures through an alert', async ({ page }) => {
  await analyze(page, '{"nodes":')

  await expect(page.getByRole('alert')).toContainText(
    'Audit could not be completed',
  )

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('exposes audit and filtered counts as status regions', async ({
  page,
}) => {
  await analyze(page, mixedWorkflow)

  await expect(
    page.getByRole('status', {
      name: 'Audit result',
    }),
  ).toBeVisible()

  const count = page.locator('.wi-finding-filter-count')

  await expect(count).toHaveAttribute('role', 'status')
  await expect(count).toHaveAttribute('aria-live', 'polite')

  await expect(count).toContainText('Showing 2 of 2 findings.')
})

test('labels grouped sections with their rule headings', async ({ page }) => {
  await analyze(page, groupedWorkflow)

  await page
    .getByRole('combobox', {
      name: 'Results view',
    })
    .selectOption('grouped')

  await expect(
    page.getByRole('region', {
      name: 'R02 · 1 finding',
    }),
  ).toBeVisible()

  await expect(
    page.getByRole('region', {
      name: 'R10 · 2 findings',
    }),
  ).toBeVisible()
})

test('activates the export button using Enter', async ({ page }) => {
  await analyze(page, emptyWorkflow)

  const exportButton = page.getByRole('button', {
    name: 'Export JSON report',
  })

  await exportButton.focus()

  const downloadPromise = page.waitForEvent('download')

  await page.keyboard.press('Enter')

  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('workflow-inspector-report.json')

  expect(await download.failure()).toBeNull()
})
