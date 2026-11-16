import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeUmamiTracker } from './umami-tracker'

const websiteId = 'b59e9c65-ae32-47f1-8400-119fcf4861c4'

type FakeScript = {
  id: string
  src: string
  async: boolean
  dataset: Record<string, string>
}

type TrackerConfig = {
  websiteId: string
  hostUrl: string
  domains: string[]
  excludeSearch: boolean
  excludeHash: boolean
  doNotTrack: boolean
  errors: boolean
  performance: boolean
  beforeSend: (type: string, payload: unknown) => Record<string, unknown> | null
}

type DemoLocation = {
  protocol: string
  hostname: string
  pathname: string
}

type FakeWindow = {
  location: DemoLocation
  umamiConfig?: TrackerConfig
}

function installBrowser(locationOverrides: Partial<DemoLocation> = {}) {
  const scripts: FakeScript[] = []

  const browserWindow: FakeWindow = {
    location: {
      protocol: 'https:',
      hostname: 'roglz.github.io',
      pathname: '/workflow-inspector/',
      ...locationOverrides,
    },
  }

  const appendChild = vi.fn((script: FakeScript) => {
    scripts.push(script)
    return script
  })

  const documentStub = {
    getElementById: vi.fn(
      (id: string) => scripts.find((script) => script.id === id) ?? null,
    ),
    createElement: vi.fn((tag: string): FakeScript => {
      if (tag !== 'script') {
        throw new Error('Unexpected element')
      }

      return {
        id: '',
        src: '',
        async: false,
        dataset: {},
      }
    }),
    head: { appendChild },
  }

  vi.stubGlobal('window', browserWindow)
  vi.stubGlobal('document', documentStub)

  return { scripts, browserWindow, documentStub, appendChild }
}

beforeEach(() => {
  vi.stubEnv('PROD', true)
  vi.stubEnv('VITE_UMAMI_WEBSITE_ID', websiteId)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Umami tracker initialization', () => {
  it('loads one script with the expected production configuration', () => {
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(true)

    expect(browser.scripts).toHaveLength(1)
    expect(browser.appendChild).toHaveBeenCalledTimes(1)

    const script = browser.scripts[0]

    expect(script.id).toBe('wi-umami-tracker')
    expect(script.src).toBe('https://cloud.umami.is/script.js')
    expect(script.async).toBe(true)
    expect(script.dataset.websiteId).toBe(websiteId)
    expect(script.dataset.domains).toBe('roglz.github.io')
    expect(script.dataset.excludeSearch).toBe('true')
    expect(script.dataset.excludeHash).toBe('true')
    expect(script.dataset.doNotTrack).toBe('true')
    expect(script.dataset.errors).toBe('false')
    expect(script.dataset.performance).toBe('false')

    const config = browser.browserWindow.umamiConfig

    expect(config?.websiteId).toBe(websiteId)
    expect(config?.hostUrl).toBe('https://cloud.umami.is')
    expect(config?.domains).toEqual(['roglz.github.io'])
    expect(config?.excludeSearch).toBe(true)
    expect(config?.excludeHash).toBe(true)
    expect(config?.doNotTrack).toBe(true)
    expect(config?.errors).toBe(false)
    expect(config?.performance).toBe(false)
    expect(config?.beforeSend).toBeTypeOf('function')
  })

  it('prevents duplicate script insertion', () => {
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(true)
    expect(initializeUmamiTracker()).toBe(false)

    expect(browser.scripts).toHaveLength(1)
    expect(browser.appendChild).toHaveBeenCalledTimes(1)
  })

  it('never inserts the tracker in development', () => {
    vi.stubEnv('PROD', false)
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(false)

    expect(browser.scripts).toHaveLength(0)
    expect(browser.browserWindow.umamiConfig).toBeUndefined()
  })

  it('rejects a missing or invalid website identifier', () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', undefined)
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(false)

    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'PRIVATE_INVALID_VALUE')

    expect(initializeUmamiTracker()).toBe(false)
    expect(browser.scripts).toHaveLength(0)
  })

  it('never loads on localhost or another domain', () => {
    const browser = installBrowser({ hostname: 'localhost' })

    expect(initializeUmamiTracker()).toBe(false)

    browser.browserWindow.location.hostname = 'example.com'

    expect(initializeUmamiTracker()).toBe(false)
    expect(browser.scripts).toHaveLength(0)
  })

  it('requires HTTPS and the exact public route', () => {
    const browser = installBrowser({ protocol: 'http:' })

    expect(initializeUmamiTracker()).toBe(false)

    browser.browserWindow.location.protocol = 'https:'
    browser.browserWindow.location.pathname = '/another-project/'

    expect(initializeUmamiTracker()).toBe(false)
    expect(browser.scripts).toHaveLength(0)
  })

  it('does not initialize without browser globals', () => {
    installBrowser()

    vi.stubGlobal('window', undefined)

    expect(initializeUmamiTracker()).toBe(false)

    installBrowser()
    vi.stubGlobal('document', undefined)

    expect(initializeUmamiTracker()).toBe(false)
  })

  it('passes sanitized events through the configured beforeSend hook', () => {
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(true)

    const beforeSend = browser.browserWindow.umamiConfig?.beforeSend

    const result = beforeSend?.('event', {
      website: websiteId,
      hostname: 'PRIVATE_HOST',
      url: '/workflow-inspector/?workflow=SECRET#PRIVATE',
      title: 'PRIVATE_WORKFLOW_NAME',
      referrer: 'https://example.com/?token=SECRET',
      name: 'audit_failed',
      data: { reason: 'invalid_json' },
    })

    expect(result).toEqual({
      website: websiteId,
      hostname: 'roglz.github.io',
      url: '/workflow-inspector/',
      title: 'Workflow Inspector',
      name: 'audit_failed',
      data: { reason: 'invalid_json' },
    })

    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('SECRET')
    expect(serialized).not.toContain('PRIVATE')
    expect(serialized).not.toContain('referrer')
  })

  it('drops unapproved events and automatic error payloads', () => {
    const browser = installBrowser()

    expect(initializeUmamiTracker()).toBe(true)

    const beforeSend = browser.browserWindow.umamiConfig?.beforeSend

    expect(
      beforeSend?.('event', {
        website: websiteId,
        name: 'PRIVATE_EVENT',
        data: { token: 'SECRET' },
      }),
    ).toBeNull()

    expect(
      beforeSend?.('error', {
        website: websiteId,
        message: 'SECRET_CREDENTIAL',
      }),
    ).toBeNull()

    expect(
      beforeSend?.('identify', {
        website: websiteId,
        id: 'PRIVATE_USER',
      }),
    ).toBeNull()
  })
})
