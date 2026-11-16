const UMAMI_HOST = 'https://cloud.umami.is'
const PUBLIC_HOST = 'roglz.github.io'
const PUBLIC_PATH = '/workflow-inspector/'
const SAFE_TITLE = 'Workflow Inspector'

const WEBSITE_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

const SCREEN_PATTERN = /^\d{1,5}x\d{1,5}$/
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3}$/i

type DemoLocation = {
  protocol: string
  hostname: string
  pathname: string
}

type SafePayload = Record<string, unknown>

type UmamiConfigWindow = Window & {
  umamiConfig?: {
    websiteId: string
    hostUrl: string
    domains: string[]
    excludeSearch: boolean
    excludeHash: boolean
    doNotTrack: boolean
    errors: boolean
    performance: boolean
    beforeSend: (type: string, payload: unknown) => SafePayload | null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFailureReason(value: unknown): boolean {
  return (
    value === 'invalid_json' ||
    value === 'invalid_structure' ||
    value === 'technical_error'
  )
}

export function shouldLoadUmami(
  production: boolean,
  websiteId: string | undefined,
  location: DemoLocation,
): boolean {
  return (
    production &&
    typeof websiteId === 'string' &&
    WEBSITE_ID_PATTERN.test(websiteId) &&
    location.protocol === 'https:' &&
    location.hostname === PUBLIC_HOST &&
    location.pathname === PUBLIC_PATH
  )
}

export function sanitizeUmamiPayload(
  type: string,
  payload: unknown,
  websiteId: string,
): SafePayload | null {
  if (type !== 'event' || !isRecord(payload) || payload.website !== websiteId) {
    return null
  }

  const safe: SafePayload = {
    website: websiteId,
    hostname: PUBLIC_HOST,
    url: PUBLIC_PATH,
    title: SAFE_TITLE,
  }

  if (
    typeof payload.screen === 'string' &&
    SCREEN_PATTERN.test(payload.screen)
  ) {
    safe.screen = payload.screen
  }

  if (
    typeof payload.language === 'string' &&
    LANGUAGE_PATTERN.test(payload.language)
  ) {
    safe.language = payload.language
  }

  if (payload.name === undefined) {
    return payload.data === undefined ? safe : null
  }

  if (payload.name === 'audit_started' || payload.name === 'audit_completed') {
    if (payload.data !== undefined) {
      return null
    }

    return { ...safe, name: payload.name }
  }

  if (payload.name === 'audit_failed') {
    if (
      !isRecord(payload.data) ||
      Object.keys(payload.data).length !== 1 ||
      !isFailureReason(payload.data.reason)
    ) {
      return null
    }

    return {
      ...safe,
      name: 'audit_failed',
      data: {
        reason: payload.data.reason,
      },
    }
  }

  return null
}

export function initializeUmamiTracker(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const websiteId: string | undefined = import.meta.env.VITE_UMAMI_WEBSITE_ID

  if (!shouldLoadUmami(import.meta.env.PROD, websiteId, window.location)) {
    return false
  }

  if (document.getElementById('wi-umami-tracker')) {
    return false
  }

  const id = websiteId as string

  const browserWindow = window as UmamiConfigWindow

  browserWindow.umamiConfig = {
    websiteId: id,
    hostUrl: UMAMI_HOST,
    domains: [PUBLIC_HOST],
    excludeSearch: true,
    excludeHash: true,
    doNotTrack: true,
    errors: false,
    performance: false,
    beforeSend: (type, payload) => sanitizeUmamiPayload(type, payload, id),
  }

  const script = document.createElement('script')

  script.id = 'wi-umami-tracker'
  script.src = `${UMAMI_HOST}/script.js`
  script.async = true

  script.dataset.websiteId = id
  script.dataset.hostUrl = UMAMI_HOST
  script.dataset.domains = PUBLIC_HOST
  script.dataset.excludeSearch = 'true'
  script.dataset.excludeHash = 'true'
  script.dataset.doNotTrack = 'true'
  script.dataset.errors = 'false'
  script.dataset.performance = 'false'

  document.head.appendChild(script)

  return true
}
