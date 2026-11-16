import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyAuditFailure,
  trackAuditCompleted,
  trackAuditFailed,
  trackAuditStarted,
} from './audit-events'

function installTracker() {
  const track = vi.fn()

  vi.stubGlobal('window', {
    umami: { track },
  })

  return track
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('audit event privacy', () => {
  it('classifies JSON and structure validation failures', () => {
    expect(classifyAuditFailure('INVALID_JSON')).toBe('invalid_json')
    expect(classifyAuditFailure('INVALID_STRUCTURE')).toBe('invalid_structure')
  })

  it('classifies known internal failures as technical errors', () => {
    expect(classifyAuditFailure('RULE_EXECUTION_FAILED')).toBe(
      'technical_error',
    )
    expect(classifyAuditFailure('INVALID_RULE_RESULT')).toBe('technical_error')
  })

  it('does not forward unknown error codes', () => {
    expect(classifyAuditFailure('PRIVATE_ERROR_DETAILS')).toBe(
      'technical_error',
    )
  })

  it('sends only the audit_started event name', () => {
    const track = installTracker()

    trackAuditStarted()

    expect(track.mock.calls).toEqual([['audit_started']])
  })

  it('sends only the audit_completed event name', () => {
    const track = installTracker()

    trackAuditCompleted()

    expect(track.mock.calls).toEqual([['audit_completed']])
  })

  it('sends the allowlisted invalid_json reason', () => {
    const track = installTracker()

    trackAuditFailed('INVALID_JSON')

    expect(track.mock.calls).toEqual([
      ['audit_failed', { reason: 'invalid_json' }],
    ])
  })

  it('sends the allowlisted invalid_structure reason', () => {
    const track = installTracker()

    trackAuditFailed('INVALID_STRUCTURE')

    expect(track.mock.calls).toEqual([
      ['audit_failed', { reason: 'invalid_structure' }],
    ])
  })

  it('never forwards sensitive content disguised as an error code', () => {
    const track = installTracker()
    const sensitive =
      '{"nodes":[{"name":"PRIVATE_NODE","credentials":{"token":"SECRET"}}]}'

    trackAuditFailed(sensitive)

    expect(track.mock.calls).toEqual([
      ['audit_failed', { reason: 'technical_error' }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain('PRIVATE_NODE')
    expect(JSON.stringify(track.mock.calls)).not.toContain('SECRET')
  })

  it('does nothing when Umami is unavailable', () => {
    vi.stubGlobal('window', {})

    expect(() => trackAuditStarted()).not.toThrow()
    expect(() => trackAuditCompleted()).not.toThrow()
    expect(() => trackAuditFailed('INVALID_JSON')).not.toThrow()
  })

  it('does not break the application if Umami throws', () => {
    const track = vi.fn(() => {
      throw new Error('Analytics unavailable')
    })

    vi.stubGlobal('window', {
      umami: { track },
    })

    expect(() => trackAuditStarted()).not.toThrow()
    expect(() => trackAuditCompleted()).not.toThrow()
    expect(() => trackAuditFailed('INVALID_JSON')).not.toThrow()
  })
})
