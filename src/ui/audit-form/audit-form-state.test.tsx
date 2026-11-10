import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import {
  auditFormReducer,
  getSafeAuditErrorText,
  initialAuditFormState,
  type AuditFormState,
} from './audit-form-state'

function inputNode(name: string, id?: string) {
  return {
    ...(id === undefined ? {} : { id }),
    name,
    type: 'example.node',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }
}

function connectedWorkflowJson(
  firstId: string | null = 'id-a',
  secondId = 'id-b',
): string {
  return JSON.stringify({
    nodes: [
      inputNode('A', firstId === null ? undefined : firstId),
      inputNode('B', secondId),
    ],
    connections: {
      A: {
        main: [
          [
            {
              node: 'B',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
  })
}

function edit(value: string): AuditFormState {
  return auditFormReducer(initialAuditFormState, {
    type: 'edit',
    value,
  })
}

function submit(value: string): AuditFormState {
  return auditFormReducer(edit(value), {
    type: 'submit',
  })
}

function getAuditResult(state: AuditFormState) {
  if (state.feedback.kind !== 'audit') {
    throw new Error('Expected an audit result')
  }

  return state.feedback.result
}

describe('Stage 4 - Local JSON audit form', () => {
  it('starts without input or feedback', () => {
    expect(initialAuditFormState).toEqual({
      input: '',
      feedback: { kind: 'idle' },
    })
  })

  it('stores the edited JSON text exactly', () => {
    const value = '  {"nodes":[],"connections":{}}  '

    expect(edit(value)).toEqual({
      input: value,
      feedback: { kind: 'idle' },
    })
  })

  it('rejects an empty submission without running the audit', () => {
    const state = submit('')

    expect(state.feedback).toEqual({ kind: 'empty' })
  })

  it('rejects whitespace-only input', () => {
    const state = submit('  \t\n  ')

    expect(state.feedback).toEqual({ kind: 'empty' })
  })

  it('audits a valid empty workflow', () => {
    const result = getAuditResult(submit('{"nodes":[],"connections":{}}'))

    expect(result).toEqual({
      success: true,
      nodeCount: 0,
      findings: [],
    })
  })

  it('counts connected nodes without inventing findings', () => {
    const result = getAuditResult(submit(connectedWorkflowJson()))

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.nodeCount).toBe(2)
      expect(result.findings).toEqual([])
    }
  })

  it('counts an R09 finding for a missing node ID', () => {
    const result = getAuditResult(submit(connectedWorkflowJson(null, 'id-b')))

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.nodeCount).toBe(2)
      expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R09'])
    }
  })

  it('counts an R01 finding for duplicate node IDs', () => {
    const result = getAuditResult(
      submit(connectedWorkflowJson('shared', 'shared')),
    )

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe('R01')
    }
  })

  it('preserves an INVALID_JSON parser failure', () => {
    const result = getAuditResult(submit('{"nodes":'))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_JSON')
    }
  })

  it('preserves an INVALID_STRUCTURE parser failure', () => {
    const result = getAuditResult(submit('{"nodes":[],"connections":[]}'))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('does not trim or modify JSON when submitting', () => {
    const value = '  {"nodes":[],"connections":{}}  '
    const state = submit(value)

    expect(state.input).toBe(value)
    expect(getAuditResult(state).success).toBe(true)
  })

  it('clears a previous successful result when edited', () => {
    const completed = submit('{"nodes":[],"connections":{}}')

    const edited = auditFormReducer(completed, {
      type: 'edit',
      value: '{"nodes":',
    })

    expect(edited.input).toBe('{"nodes":')
    expect(edited.feedback).toEqual({ kind: 'idle' })
  })

  it('clears a previous error when edited', () => {
    const failed = submit('{"nodes":')

    const edited = auditFormReducer(failed, {
      type: 'edit',
      value: '{"nodes":[],"connections":{}}',
    })

    expect(edited.feedback).toEqual({ kind: 'idle' })
  })

  it('uses fixed text for supported error codes', () => {
    const codes = [
      'INVALID_JSON',
      'INVALID_STRUCTURE',
      'RULE_EXECUTION_FAILED',
      'INVALID_RULE_RESULT',
    ]

    for (const code of codes) {
      const text = getSafeAuditErrorText(code)

      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toContain(code)
    }
  })

  it('does not reveal an unknown error code', () => {
    const secretCode = 'SENTINEL_PRIVATE_ERROR_CODE'

    expect(getSafeAuditErrorText(secretCode)).toBe(
      'The audit could not be completed.',
    )

    expect(getSafeAuditErrorText(secretCode)).not.toContain(secretCode)
  })

  it('renders an accessible JSON form', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('id="workflow-json"')
    expect(html).toContain('for="workflow-json"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('Analyze JSON')
    expect(html).toContain('name="workflow-json"')
  })

  it('does not display audit results before submission', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).not.toContain('Nodes analyzed')
    expect(html).not.toContain('Findings detected')
    expect(html).not.toContain('Audit completed')
  })
})
