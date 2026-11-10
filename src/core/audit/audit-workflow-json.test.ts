import { describe, expect, it } from 'vitest'

import type { AuditWorkflowResult } from './audit-workflow-json'
import { auditWorkflowJson } from './audit-workflow-json'
import n8nDemoRaw from '../parser/fixtures/n8n-demo.workflow.json?raw'

function inputNode(
  name: string,
  id?: string,
  parameters: Record<string, unknown> = {},
) {
  return {
    ...(id === undefined ? {} : { id }),
    name,
    type: 'example.node',
    typeVersion: 1,
    position: [0, 0],
    parameters,
  }
}

function connection(node: string, type = 'main', index = 0) {
  return { node, type, index }
}

function workflowJson(
  nodes: ReturnType<typeof inputNode>[],
  connections: Record<string, unknown> = {},
): string {
  return JSON.stringify({ nodes, connections })
}

function successfulAudit(
  raw: string,
): Extract<AuditWorkflowResult, { success: true }> {
  const result = auditWorkflowJson(raw)

  if (!result.success) {
    throw new Error('Expected the audit to succeed')
  }

  return result
}

describe('Audit workflow JSON - application entry point', () => {
  it('accepts an empty valid workflow', () => {
    const result = successfulAudit(workflowJson([]))

    expect(result).toEqual({
      success: true,
      nodeCount: 0,
      findings: [],
    })
  })

  it('accepts a valid workflow with one node', () => {
    const result = successfulAudit(workflowJson([inputNode('Only', 'id-only')]))

    expect(result.nodeCount).toBe(1)
    expect(result.findings).toEqual([])
  })

  it('accepts valid main and AI connections', () => {
    const raw = workflowJson(
      [
        inputNode('Start', 'id-start'),
        inputNode('Target', 'id-target'),
        inputNode('Model', 'id-model'),
      ],
      {
        Start: {
          main: [[connection('Target')]],
        },
        Model: {
          ai_languageModel: [[connection('Target', 'ai_languageModel')]],
        },
      },
    )

    const result = successfulAudit(raw)

    expect(result.nodeCount).toBe(3)
    expect(result.findings).toEqual([])
  })

  it('preserves the R01 and R09 finding order', () => {
    const raw = workflowJson(
      [
        inputNode('A', 'shared-id'),
        inputNode('B', 'shared-id'),
        inputNode('C'),
      ],
      {
        A: { main: [[connection('B')]] },
        B: { main: [[connection('C')]] },
      },
    )

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R01',
      'R09',
    ])

    expect(result.findings.map((finding) => finding.nodeIndex)).toEqual([1, 2])
  })

  it('preserves the R02 and R10 finding order', () => {
    const raw = workflowJson([
      inputNode('', 'id-a'),
      inputNode('', 'id-b'),
      inputNode('Valid', 'id-c'),
    ])

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R02',
      'R10',
      'R10',
    ])

    expect(result.findings.map((finding) => finding.nodeIndex)).toEqual([
      1, 0, 1,
    ])
  })

  it('distinguishes R03 dangling references from R04 bad structures', () => {
    const raw = workflowJson(
      [inputNode('Source', 'id-source'), inputNode('Target', 'id-target')],
      {
        Source: {
          main: [
            [
              connection('Missing'),
              {
                node: 'Target',
                type: 'main',
                index: 'invalid',
              },
            ],
          ],
        },
      },
    )

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R03',
      'R04',
    ])
  })

  it('exposes R05 isolated-node findings', () => {
    const raw = workflowJson(
      [
        inputNode('A', 'id-a'),
        inputNode('B', 'id-b'),
        inputNode('Unused', 'id-unused'),
      ],
      {
        A: { main: [[connection('B')]] },
      },
    )

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R05'])

    expect(result.findings[0].nodeIndex).toBe(2)
  })

  it('exposes R06 disconnected-group findings', () => {
    const raw = workflowJson(
      [
        inputNode('A', 'id-a'),
        inputNode('B', 'id-b'),
        inputNode('C', 'id-c'),
        inputNode('D', 'id-d'),
      ],
      {
        A: { main: [[connection('B')]] },
        C: { main: [[connection('D')]] },
      },
    )

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R06',
      'R06',
    ])

    expect(result.findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('exposes R07 directed-cycle findings', () => {
    const raw = workflowJson([inputNode('A', 'id-a'), inputNode('B', 'id-b')], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('A')]] },
    })

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R07'])

    expect(result.findings[0].nodeIndex).toBe(0)
  })

  it('exposes R08 duplicate-connection findings', () => {
    const raw = workflowJson([inputNode('A', 'id-a'), inputNode('B', 'id-b')], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R08'])

    expect(result.findings[0].nodeIndex).toBe(0)
  })

  it('exposes R09 missing-identifier findings', () => {
    const result = successfulAudit(workflowJson([inputNode('Source')]))

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R09'])

    expect(result.findings[0].severity).toBe('warning')
    expect(result.findings[0].confidence).toBe('high')
  })

  it('exposes R10 blank-name findings', () => {
    const result = successfulAudit(workflowJson([inputNode('   ', 'id-blank')]))

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R10'])

    expect(result.findings[0].nodeIndex).toBe(0)
  })

  it('returns the parser error for invalid JSON', () => {
    const secret = 'SENTINEL_PRIVATE_INVALID_JSON'

    const result = auditWorkflowJson(`{"nodes":${secret}`)

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_JSON')
    }

    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('returns the parser error for invalid structure', () => {
    const result = auditWorkflowJson('{"nodes":[],"connections":[]}')

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }

    expect(result).not.toHaveProperty('findings')
  })

  it('does not expose private workflow values in findings', () => {
    const secret = 'SENTINEL_PRIVATE_AUDIT_4'

    const raw = workflowJson([
      inputNode(secret, undefined, {
        apiKey: secret,
      }),
    ])

    const result = successfulAudit(raw)

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R09'])

    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('returns deterministic results for repeated audits', () => {
    const raw = workflowJson([inputNode('A', 'id-a'), inputNode('B', 'id-b')], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    const first = auditWorkflowJson(raw)
    const second = auditWorkflowJson(raw)

    expect(second).toEqual(first)
  })

  it('processes the adapted official n8n fixture', () => {
    const result = auditWorkflowJson(n8nDemoRaw)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.nodeCount).toBeGreaterThan(0)

      for (const finding of result.findings) {
        if (finding.nodeIndex !== undefined) {
          expect(finding.nodeIndex).toBeLessThan(result.nodeCount)
        }
      }
    }
  })

  it('preserves the original input and counts all nodes', () => {
    const originalWorkflow = {
      name: 'Example workflow',
      active: false,
      nodes: [
        inputNode('A', 'id-a'),
        inputNode('B', 'id-b'),
        inputNode('Unused', 'id-unused'),
      ],
      connections: {
        A: {
          main: [[connection('B')]],
        },
      },
      settings: {},
    }

    const originalSnapshot = JSON.stringify(originalWorkflow)
    const result = successfulAudit(originalSnapshot)

    expect(result.nodeCount).toBe(3)
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(['R05'])

    expect(JSON.stringify(originalWorkflow)).toBe(originalSnapshot)
  })
})
