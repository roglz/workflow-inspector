import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4176'
const MAX_BYTES = 5 * 1024 * 1024

const emptyWorkflow = '{"nodes":[],"connections":{}}'

function createNode(index: number) {
  return {
    id: `node-${index}`,
    name: `Node ${index}`,
    type: 'example.node',
    typeVersion: 1,
    position: [index * 100, 0],
    parameters: {},
  }
}

async function analyze(page: Page, raw: string) {
  await page.locator('#workflow-json').fill(raw)

  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()
}

async function downloadReport(page: Page) {
  const downloadPromise = page.waitForEvent('download')

  await page
    .getByRole('button', {
      name: 'Export JSON report',
    })
    .click()

  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('workflow-inspector-report.json')

  expect(await download.failure()).toBeNull()

  return readFile(await download.path(), 'utf8')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('rejects a JSON file larger than 5 MiB without replacing existing text', async ({
  page,
}) => {
  const textarea = page.locator('#workflow-json')

  await textarea.fill(emptyWorkflow)

  await page.locator('#workflow-json-file').setInputFiles({
    name: 'oversized.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(MAX_BYTES + 1, 32),
  })

  await expect(page.getByRole('alert')).toBeVisible()

  await expect(textarea).toHaveValue(emptyWorkflow)

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('accepts a JSON file at the exact 5 MiB boundary', async ({ page }) => {
  const content = emptyWorkflow.padEnd(MAX_BYTES, ' ')

  expect(Buffer.byteLength(content, 'utf8')).toBe(MAX_BYTES)

  await page.locator('#workflow-json-file').setInputFiles({
    name: 'maximum-size.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content, 'utf8'),
  })

  await expect(page.getByText(/File loaded/)).toBeVisible()

  const textarea = page.locator('#workflow-json')

  await expect
    .poll(
      () =>
        textarea.evaluate(
          (element) => (element as HTMLTextAreaElement).value.length,
        ),
      { timeout: 30_000 },
    )
    .toBe(MAX_BYTES)

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('rejects an empty local JSON file without losing existing input', async ({
  page,
}) => {
  const textarea = page.locator('#workflow-json')

  await textarea.fill(emptyWorkflow)

  await page.locator('#workflow-json-file').setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(0),
  })

  await expect(page.getByRole('alert')).toBeVisible()

  await expect(textarea).toHaveValue(emptyWorkflow)
})

test('rejects an invalid workflow structure without exposing export', async ({
  page,
}) => {
  await analyze(page, '{"nodes":42,"connections":{}}')

  await expect(
    page.getByRole('heading', {
      name: 'Audit could not be completed',
    }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toHaveCount(0)
})

test('replaces previous results after consecutive audits', async ({ page }) => {
  await analyze(page, emptyWorkflow)

  await expect(page.locator('.wi-metrics strong').first()).toHaveText('0')

  const oneNodeWorkflow = JSON.stringify({
    nodes: [createNode(1)],
    connections: {},
  })

  await analyze(page, oneNodeWorkflow)

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await expect(page.locator('.wi-metrics strong').first()).toHaveText('1')

  const report = JSON.parse(await downloadReport(page)) as {
    nodeCount: number
  }

  expect(report.nodeCount).toBe(1)
})

test('accepts valid JSON containing accented and Unicode node names', async ({
  page,
}) => {
  const unicodeWorkflow = JSON.stringify({
    nodes: [
      {
        ...createNode(1),
        id: 'id-árbol',
        name: 'Árbol 🌳',
      },
    ],
    connections: {},
  })

  await analyze(page, unicodeWorkflow)

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await expect(page.locator('.wi-metrics strong').first()).toHaveText('1')
})

test('does not include private node names or parameters in the exported report', async ({
  page,
}) => {
  const secret = 'SENTINEL_PRIVATE_ROBUSTNESS_56'

  const raw = JSON.stringify({
    nodes: [
      {
        name: secret,
        type: 'example.node',
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          authorization: secret,
        },
      },
    ],
    connections: {},
  })

  await analyze(page, raw)

  const text = await downloadReport(page)

  const report = JSON.parse(text) as {
    formatVersion: number
    nodeCount: number
    findings: Array<{ ruleId: string }>
  }

  expect(report.formatVersion).toBe(1)
  expect(report.nodeCount).toBe(1)

  expect(report.findings.some((finding) => finding.ruleId === 'R09')).toBe(true)

  expect(text).not.toContain(secret)
  expect(text).not.toContain('"parameters"')
  expect(text).not.toContain('"authorization"')
})

test('does not issue external HTTP requests or HTTP writes during the tested flow', async ({
  page,
}) => {
  const unexpectedRequests: string[] = []

  page.on('request', (request) => {
    const url = request.url()

    if (!/^https?:\/\//.test(url)) {
      return
    }

    const origin = new URL(url).origin

    if (origin !== baseURL || request.method() !== 'GET') {
      unexpectedRequests.push(`${request.method()} ${url}`)
    }
  })

  await analyze(page, emptyWorkflow)

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await downloadReport(page)

  expect(unexpectedRequests).toEqual([])
})

test('measures a synthetic audit with 100 disconnected nodes', async ({
  page,
}) => {
  const raw = JSON.stringify({
    nodes: Array.from({ length: 100 }, (_, index) => createNode(index)),
    connections: {},
  })

  await page.locator('#workflow-json').fill(raw)

  const startedAt = Date.now()

  await page
    .getByRole('button', {
      name: 'Analyze JSON',
    })
    .click()

  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toBeVisible()

  await expect(page.locator('.wi-metrics strong').first()).toHaveText('100')

  const elapsedMs = Date.now() - startedAt

  console.log(`ROBUSTNESS_AUDIT_100_NODES_MS=${elapsedMs}`)

  const report = JSON.parse(await downloadReport(page)) as {
    nodeCount: number
    findingCount: number
  }

  expect(report.nodeCount).toBe(100)
  expect(report.findingCount).toBeGreaterThan(0)
})
