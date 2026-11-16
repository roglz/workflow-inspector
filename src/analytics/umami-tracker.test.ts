import { describe, expect, it } from 'vitest'
import { sanitizeUmamiPayload, shouldLoadUmami } from './umami-tracker'

const websiteId = 'b59e9c65-ae32-47f1-8400-119fcf4861c4'

const demoLocation = {
  protocol: 'https:',
  hostname: 'roglz.github.io',
  pathname: '/workflow-inspector/',
}

function makePayload(extra: Record<string, unknown> = {}) {
  return {
    website: websiteId,
    hostname: 'roglz.github.io',
    screen: '1920x1080',
    language: 'en-US',
    url: 'https://roglz.github.io/workflow-inspector/?json=SECRET#PRIVATE',
    title: 'PRIVATE_WORKFLOW_TITLE',
    referrer: 'https://example.com/private-workflow?token=SECRET',
    ...extra,
  }
}

describe('Umami public-demo restrictions', () => {
  it('allows the configured production demo', () => {
    expect(shouldLoadUmami(true, websiteId, demoLocation)).toBe(true)
  })

  it('never loads in development', () => {
    expect(shouldLoadUmami(false, websiteId, demoLocation)).toBe(false)
  })

  it('rejects a missing or malformed website identifier', () => {
    expect(shouldLoadUmami(true, undefined, demoLocation)).toBe(false)
    expect(shouldLoadUmami(true, '', demoLocation)).toBe(false)
    expect(shouldLoadUmami(true, 'PRIVATE_SECRET', demoLocation)).toBe(false)
  })

  it('rejects localhost and unrelated domains', () => {
    expect(
      shouldLoadUmami(true, websiteId, {
        ...demoLocation,
        hostname: 'localhost',
      }),
    ).toBe(false)

    expect(
      shouldLoadUmami(true, websiteId, {
        ...demoLocation,
        hostname: 'example.com',
      }),
    ).toBe(false)
  })

  it('requires HTTPS and the exact public path', () => {
    expect(
      shouldLoadUmami(true, websiteId, {
        ...demoLocation,
        protocol: 'http:',
      }),
    ).toBe(false)

    expect(
      shouldLoadUmami(true, websiteId, {
        ...demoLocation,
        pathname: '/another-project/',
      }),
    ).toBe(false)
  })
})

describe('Umami outgoing payload privacy', () => {
  it('sanitizes pageviews to constant public metadata', () => {
    const result = sanitizeUmamiPayload('event', makePayload(), websiteId)

    expect(result).toEqual({
      website: websiteId,
      hostname: 'roglz.github.io',
      url: '/workflow-inspector/',
      title: 'Workflow Inspector',
      screen: '1920x1080',
      language: 'en-US',
    })

    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('SECRET')
    expect(serialized).not.toContain('PRIVATE')
    expect(serialized).not.toContain('referrer')
  })

  it('allows audit_started without custom properties', () => {
    const result = sanitizeUmamiPayload(
      'event',
      makePayload({ name: 'audit_started' }),
      websiteId,
    )

    expect(result?.name).toBe('audit_started')
    expect(result).not.toHaveProperty('data')
  })

  it('allows audit_completed without custom properties', () => {
    const result = sanitizeUmamiPayload(
      'event',
      makePayload({ name: 'audit_completed' }),
      websiteId,
    )

    expect(result?.name).toBe('audit_completed')
    expect(result).not.toHaveProperty('data')
  })

  it('allows only predefined audit failure reasons', () => {
    for (const reason of [
      'invalid_json',
      'invalid_structure',
      'technical_error',
    ]) {
      const result = sanitizeUmamiPayload(
        'event',
        makePayload({
          name: 'audit_failed',
          data: { reason },
        }),
        websiteId,
      )

      expect(result?.data).toEqual({ reason })
    }
  })

  it('drops unexpected event names', () => {
    expect(
      sanitizeUmamiPayload(
        'event',
        makePayload({ name: 'PRIVATE_NODE_NAME' }),
        websiteId,
      ),
    ).toBeNull()
  })

  it('drops sensitive properties on success events', () => {
    expect(
      sanitizeUmamiPayload(
        'event',
        makePayload({
          name: 'audit_completed',
          data: { workflow: 'SECRET' },
        }),
        websiteId,
      ),
    ).toBeNull()
  })

  it('drops messages and extra properties on failure events', () => {
    expect(
      sanitizeUmamiPayload(
        'event',
        makePayload({
          name: 'audit_failed',
          data: {
            reason: 'technical_error',
            message: 'PRIVATE_CREDENTIAL',
          },
        }),
        websiteId,
      ),
    ).toBeNull()
  })

  it('drops unknown failure categories', () => {
    expect(
      sanitizeUmamiPayload(
        'event',
        makePayload({
          name: 'audit_failed',
          data: { reason: 'SECRET_WORKFLOW_DETAILS' },
        }),
        websiteId,
      ),
    ).toBeNull()
  })

  it('rejects mismatched website identifiers', () => {
    expect(
      sanitizeUmamiPayload(
        'event',
        makePayload({ website: 'another-site' }),
        websiteId,
      ),
    ).toBeNull()
  })

  it('rejects error, identification and performance payloads', () => {
    for (const type of ['error', 'identify', 'performance']) {
      expect(sanitizeUmamiPayload(type, makePayload(), websiteId)).toBeNull()
    }
  })

  it('never forwards unexpected browser metadata', () => {
    const result = sanitizeUmamiPayload(
      'event',
      makePayload({
        screen: 'SECRET_SCREEN_VALUE',
        language: 'PRIVATE_LANGUAGE_VALUE',
        id: 'PRIVATE_USER_ID',
        filename: 'SECRET_WORKFLOW.json',
        credentials: { token: 'SECRET' },
      }),
      websiteId,
    )

    expect(result).toEqual({
      website: websiteId,
      hostname: 'roglz.github.io',
      url: '/workflow-inspector/',
      title: 'Workflow Inspector',
    })
  })
})
