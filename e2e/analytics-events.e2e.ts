import { expect, test, type Page } from '@playwright/test'

type CapturedEvent = {
  name: string
  data?: { reason: string }
}

const validWorkflow = '{"nodes":[],"connections":{}}'
const malformedJson = '{"nodes":'
const invalidStructure = '{"nodes":[],"connections":[]}'

const sentinel = 'PRIVATE_WORKFLOW_SENTINEL_2026'

const sensitiveWorkflow = JSON.stringify({
  nodes: [
    {
      id: 'node-1',
      name: sentinel,
      type: 'example.node',
      typeVersion: 1,
      position: [0, 0],
      parameters: {
        token: sentinel,
      },
      credentials: {
        account: {
          id: sentinel,
          name: sentinel,
        },
      },
    },
  ],
  connections: {},
})

async function openWithTracker(page: Page) {
  await page.addInitScript(() => {
    const events: CapturedEvent[] = []

    Object.assign(window, {
      __wiCapturedEvents: events,
      umami: {
        track(name: string, data?: { reason: string }) {
          events.push(data === undefined ? { name } : { name, data })
        },
      },
    })
  })

  await page.goto('/')
}

async function capturedEvents(page: Page): Promise<CapturedEvent[]> {
  return page.evaluate(() => {
    const instrumentedWindow = window as Window & {
      __wiCapturedEvents: CapturedEvent[]
    }

    return instrumentedWindow.__wiCapturedEvents
  })
}

async function analyze(page: Page, input: string) {
  await page.locator('#workflow-json').fill(input)
  await page.getByRole('button', { name: 'Analyze JSON' }).click()
}

test('does not track empty or whitespace-only submissions', async ({
  page,
}) => {
  await openWithTracker(page)

  await page.getByRole('button', { name: 'Analyze JSON' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Paste a workflow JSON before analyzing.',
  )

  expect(await capturedEvents(page)).toEqual([])

  await analyze(page, '   ')

  expect(await capturedEvents(page)).toEqual([])
})

test('tracks a successful audit once without exposing workflow data', async ({
  page,
}) => {
  await openWithTracker(page)

  await analyze(page, sensitiveWorkflow)

  await expect(
    page.getByRole('heading', { name: 'Audit completed' }),
  ).toBeVisible()

  const events = await capturedEvents(page)

  expect(events).toEqual([
    { name: 'audit_started' },
    { name: 'audit_completed' },
  ])

  const transmittedData = JSON.stringify(events)

  expect(transmittedData).not.toContain(sentinel)
  expect(transmittedData).not.toContain('credentials')
  expect(transmittedData).not.toContain('parameters')
  expect(transmittedData).not.toContain('nodes')

  await page.locator('#workflow-json').fill(validWorkflow)

  expect(await capturedEvents(page)).toEqual(events)
})

test('classifies malformed JSON without sending its content', async ({
  page,
}) => {
  await openWithTracker(page)

  await analyze(page, malformedJson)

  await expect(
    page.getByRole('heading', { name: 'Audit could not be completed' }),
  ).toBeVisible()

  const events = await capturedEvents(page)

  expect(events).toEqual([
    { name: 'audit_started' },
    {
      name: 'audit_failed',
      data: { reason: 'invalid_json' },
    },
  ])

  expect(JSON.stringify(events)).not.toContain(malformedJson)
})

test('classifies invalid workflow structure', async ({ page }) => {
  await openWithTracker(page)

  await analyze(page, invalidStructure)

  await expect(
    page.getByRole('heading', { name: 'Audit could not be completed' }),
  ).toBeVisible()

  expect(await capturedEvents(page)).toEqual([
    { name: 'audit_started' },
    {
      name: 'audit_failed',
      data: { reason: 'invalid_structure' },
    },
  ])
})

test('counts deliberate repeat audits without duplicated events', async ({
  page,
}) => {
  await openWithTracker(page)

  await analyze(page, validWorkflow)

  await expect(
    page.getByRole('heading', { name: 'Audit completed' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Analyze JSON' }).click()

  expect(await capturedEvents(page)).toEqual([
    { name: 'audit_started' },
    { name: 'audit_completed' },
    { name: 'audit_started' },
    { name: 'audit_completed' },
  ])
})

test('does not track file imports until the user starts an audit', async ({
  page,
}) => {
  await openWithTracker(page)

  const privateFilename = 'PRIVATE_FILENAME_2026.json'

  await page.locator('#workflow-json-file').setInputFiles({
    name: privateFilename,
    mimeType: 'application/json',
    buffer: Buffer.from(sensitiveWorkflow, 'utf8'),
  })

  await expect(page.getByText(/File loaded/)).toBeVisible()
  await expect(page.locator('#workflow-json')).toHaveValue(sensitiveWorkflow)

  expect(await capturedEvents(page)).toEqual([])

  await page.getByRole('button', { name: 'Analyze JSON' }).click()

  await expect(
    page.getByRole('heading', { name: 'Audit completed' }),
  ).toBeVisible()

  const events = await capturedEvents(page)

  expect(events).toEqual([
    { name: 'audit_started' },
    { name: 'audit_completed' },
  ])

  const transmittedData = JSON.stringify(events)

  expect(transmittedData).not.toContain(privateFilename)
  expect(transmittedData).not.toContain(sentinel)
})

test('keeps local auditing functional without Umami', async ({ page }) => {
  await page.goto('/')

  await analyze(page, validWorkflow)

  await expect(
    page.getByRole('heading', { name: 'Audit completed' }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'Export JSON report' }),
  ).toBeVisible()
})
