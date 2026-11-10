import { expect, test } from '@playwright/test'

test('serves compiled JS and CSS instead of Vite development resources', async ({
  request,
}) => {
  const response = await request.get('/')

  expect(response.status()).toBe(200)

  const html = await response.text()

  expect(html).not.toContain('/@vite/client')
  expect(html).not.toContain('/src/main.tsx')

  const scriptPath = html.match(
    /<script\b[^>]*\bsrc="(\/assets\/index-[^"]+\.js)"/,
  )?.[1]

  const stylePath = html.match(
    /<link\b[^>]*\bhref="(\/assets\/index-[^"]+\.css)"/,
  )?.[1]

  expect(scriptPath).toMatch(/^\/assets\/index-[^/]+\.js$/)

  expect(stylePath).toMatch(/^\/assets\/index-[^/]+\.css$/)

  if (!scriptPath || !stylePath) {
    throw new Error('Expected compiled JavaScript and CSS assets')
  }

  const [scriptResponse, styleResponse] = await Promise.all([
    request.get(scriptPath),
    request.get(stylePath),
  ])

  expect(scriptResponse.status()).toBe(200)
  expect(styleResponse.status()).toBe(200)

  const scriptBody = await scriptResponse.body()
  const styleBody = await styleResponse.body()

  expect(scriptBody.byteLength).toBeGreaterThan(1000)
  expect(styleBody.byteLength).toBeGreaterThan(100)
})

test('runs an audit in the compiled application', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)

  await expect(
    page.getByRole('heading', {
      name: 'Workflow Inspector',
    }),
  ).toBeVisible()

  await page.locator('#workflow-json').fill('{"nodes":[],"connections":{}}')

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

  await expect(page.locator('.wi-metrics strong')).toHaveText(['0', '0'])

  await expect(
    page.getByRole('button', {
      name: 'Export JSON report',
    }),
  ).toBeVisible()
})
