import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuditWorkflowResult } from '../core/audit/audit-workflow-json'
import { runTrackedAudit } from './run-tracked-audit'

function installTracker() {
  const track = vi.fn()

  vi.stubGlobal('window', {
    umami: { track },
  })

  return track
}

const validJson = '{"nodes":[],"connections":{}}'
const invalidJson = '{"nodes":'
const invalidStructure = '{"nodes":[],"connections":[]}'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tracked audit attempts', () => {
  it('does not audit or track an empty input', () => {
    const track = installTracker()
    const audit = vi.fn()

    const outcome = runTrackedAudit('', audit)

    expect(outcome).toEqual({ kind: 'empty' })
    expect(audit).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('does not audit or track whitespace-only input', () => {
    const track = installTracker()
    const audit = vi.fn()

    const outcome = runTrackedAudit('  \t\n  ', audit)

    expect(outcome).toEqual({ kind: 'empty' })
    expect(audit).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('audits valid JSON once and sends one event pair', () => {
    const track = installTracker()
    const audit = vi.fn((): AuditWorkflowResult => ({
      success: true,
      nodeCount: 0,
      findings: [],
    }))

    const outcome = runTrackedAudit(validJson, audit)

    expect(outcome.kind).toBe('result')
    expect(audit).toHaveBeenCalledExactlyOnceWith(validJson)
    expect(track.mock.calls).toEqual([['audit_started'], ['audit_completed']])
  })

  it('classifies malformed JSON without leaking input', () => {
    const track = installTracker()

    const outcome = runTrackedAudit(invalidJson)

    expect(outcome.kind).toBe('result')
    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_failed', { reason: 'invalid_json' }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain(invalidJson)
  })

  it('classifies invalid workflow structure', () => {
    const track = installTracker()

    const outcome = runTrackedAudit(invalidStructure)

    expect(outcome.kind).toBe('result')
    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_failed', { reason: 'invalid_structure' }],
    ])
  })

  it('classifies rule execution failures as technical errors', () => {
    const track = installTracker()

    const audit = vi.fn((): AuditWorkflowResult => ({
      success: false,
      error: {
        code: 'RULE_EXECUTION_FAILED',
        ruleId: 'R01',
        message: 'PRIVATE_WORKFLOW_INFORMATION',
      },
    }))

    const outcome = runTrackedAudit(validJson, audit)

    expect(outcome.kind).toBe('result')
    expect(audit).toHaveBeenCalledTimes(1)
    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_failed', { reason: 'technical_error' }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain(
      'PRIVATE_WORKFLOW_INFORMATION',
    )
  })

  it('classifies invalid rule results as technical errors', () => {
    const track = installTracker()

    const audit = vi.fn((): AuditWorkflowResult => ({
      success: false,
      error: {
        code: 'INVALID_RULE_RESULT',
        ruleId: 'R01',
        message: 'PRIVATE_NODE_NAME',
      },
    }))

    runTrackedAudit(validJson, audit)

    expect(audit).toHaveBeenCalledTimes(1)
    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_failed', { reason: 'technical_error' }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain('PRIVATE_NODE_NAME')
  })

  it('handles unexpected exceptions without leaking messages', () => {
    const track = installTracker()

    const audit = vi.fn((): AuditWorkflowResult => {
      throw new Error('SECRET_CREDENTIAL_VALUE')
    })

    const outcome = runTrackedAudit(validJson, audit)

    expect(outcome).toEqual({ kind: 'unexpected_failure' })
    expect(audit).toHaveBeenCalledTimes(1)
    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_failed', { reason: 'technical_error' }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain(
      'SECRET_CREDENTIAL_VALUE',
    )
  })

  it('continues auditing when Umami is unavailable', () => {
    vi.stubGlobal('window', {})

    const outcome = runTrackedAudit(validJson)

    expect(outcome.kind).toBe('result')

    if (outcome.kind === 'result') {
      expect(outcome.result.success).toBe(true)
    }
  })

  it('continues auditing when the tracker throws', () => {
    const track = vi.fn(() => {
      throw new Error('Tracker unavailable')
    })

    vi.stubGlobal('window', {
      umami: { track },
    })

    const outcome = runTrackedAudit(validJson)

    expect(outcome.kind).toBe('result')
    expect(track).toHaveBeenCalledTimes(2)
  })

  it('counts two deliberate attempts without duplicating either', () => {
    const track = installTracker()

    runTrackedAudit(validJson)
    runTrackedAudit(validJson)

    expect(track.mock.calls).toEqual([
      ['audit_started'],
      ['audit_completed'],
      ['audit_started'],
      ['audit_completed'],
    ])
  })
})
