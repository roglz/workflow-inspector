import { expect, test } from '@playwright/test'

const emptyWorkflow = '{"nodes":[],"connections":{}}'

test('allows selecting the same local JSON file again after editing', async ({
  page,
}) => {
  await page.goto('/')

  const fileInput = page.locator('#workflow-json-file')
  const textarea = page.locator('#workflow-json')

  const testFile = {
    name: 'workflow.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emptyWorkflow, 'utf8'),
  }

  await fileInput.setInputFiles(testFile)

  await expect(textarea).toHaveValue(emptyWorkflow)

  await expect(page.getByText(/File loaded/)).toBeVisible()

  // The user starts editing the imported content.
  await textarea.fill('{"nodes":')

  await expect(textarea).toHaveValue('{"nodes":')

  // Selecting the same file must replace manual edits.
  await fileInput.setInputFiles(testFile)

  await expect(textarea).toHaveValue(emptyWorkflow)

  await expect(page.getByText(/File loaded/)).toBeVisible()

  // Import must not execute the audit automatically.
  await expect(
    page.getByRole('heading', {
      name: 'Audit completed',
    }),
  ).toHaveCount(0)
})

test('keeps audit and export HTTP requests on the local origin', async ({
  page,
}) => {
  const allowedOrigin = 'http://127.0.0.1:5175'
  let externalRequestCount = 0

  page.on('request', (request) => {
    const url = request.url()

    if (
      (url.startsWith('http://') || url.startsWith('https://')) &&
      new URL(url).origin !== allowedOrigin
    ) {
      externalRequestCount += 1
    }
  })

  await page.goto('/')

  await page.locator('#workflow-json').fill(emptyWorkflow)

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

  const downloadPromise = page.waitForEvent('download')

  await page
    .getByRole('button', {
      name: 'Export JSON report',
    })
    .click()

  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('workflow-inspector-report.json')

  expect(await download.failure()).toBeNull()

  expect(externalRequestCount).toBe(0)
})
