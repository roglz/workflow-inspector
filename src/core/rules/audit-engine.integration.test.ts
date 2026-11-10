import { describe, expect, it } from 'vitest'

import { ruleIds } from '../models/finding'
import type { Finding } from '../models/finding'
import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import n8nDemoRaw from '../parser/fixtures/n8n-demo.workflow.json?raw'
import type { AuditRule } from './rule-contract'
import { r01DuplicateNodeIdsRule } from './r01-duplicate-node-ids'
import { r02DuplicateNodeNamesRule } from './r02-duplicate-node-names'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { r04MalformedConnectionsRule } from './r04-malformed-connections'
import { r05IsolatedNodesRule } from './r05-isolated-nodes'
import { r06DisconnectedGroupsRule } from './r06-disconnected-groups'
import { r07MainConnectionCyclesRule } from './r07-main-connection-cycles'
import { r08DuplicateConnectionsRule } from './r08-duplicate-connections'
import { r09MissingNodeIdsRule } from './r09-missing-node-ids'
import { r10BlankNodeNamesRule } from './r10-blank-node-names'
import { runRules } from './run-rules'

const auditRules: readonly AuditRule[] = [
  r01DuplicateNodeIdsRule,
  r02DuplicateNodeNamesRule,
  r03DanglingNodeReferencesRule,
  r04MalformedConnectionsRule,
  r05IsolatedNodesRule,
  r06DisconnectedGroupsRule,
  r07MainConnectionCyclesRule,
  r08DuplicateConnectionsRule,
  r09MissingNodeIdsRule,
  r10BlankNodeNamesRule,
]

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

function createWorkflow(
  nodes: ReturnType<typeof inputNode>[],
  connections: Record<string, unknown> = {},
): NormalizedWorkflow {
  const raw = JSON.stringify({ nodes, connections })
  const parsed = parseWorkflowJson(raw)

  if (!parsed.success) {
    throw new Error('Invalid audit test fixture')
  }

  return normalizeWorkflow(parsed.workflow)
}

function audit(workflow: NormalizedWorkflow): Finding[] {
  const result = runRules(workflow, auditRules)

  if (!result.success) {
    throw new Error('Unexpected audit execution failure')
  }

  return result.findings
}

describe('Stage 3 - Complete audit engine integration', () => {
  it('contains all ten rules once, in canonical order', () => {
    const ids = auditRules.map((rule) => rule.id)

    expect(ids).toEqual([...ruleIds])
    expect(new Set(ids).size).toBe(10)

    expect(auditRules.every((rule) => rule.description.trim().length > 0)).toBe(
      true,
    )
  })

  it('accepts an empty valid workflow', () => {
    const workflow = createWorkflow([], {})

    expect(audit(workflow)).toEqual([])
  })

  it('accepts a valid graph with main and AI connections', () => {
    const workflow = createWorkflow(
      [inputNode('A', 'id-a'), inputNode('B', 'id-b'), inputNode('C', 'id-c')],
      {
        A: {
          main: [[connection('B')]],
        },
        C: {
          ai_languageModel: [[connection('B', 'ai_languageModel')]],
        },
      },
    )

    expect(audit(workflow)).toEqual([])
  })

  it('reports R01 and R09 independently', () => {
    const workflow = createWorkflow(
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

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R01', 'R09'])

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 2])
  })

  it('reports R02 and R10 independently', () => {
    const workflow = createWorkflow(
      [
        inputNode('', 'id-a'),
        inputNode('', 'id-b'),
        inputNode('Valid', 'id-c'),
      ],
      {},
    )

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      'R02',
      'R10',
      'R10',
    ])

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 0, 1])
  })

  it('separates dangling references from malformed entries', () => {
    const workflow = createWorkflow(
      [
        inputNode('Source', 'id-a'),
        inputNode('Target', 'id-b'),
        inputNode('Other', 'id-c'),
      ],
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

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R03', 'R04'])

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 0])
  })

  it('reports isolated nodes through R05', () => {
    const workflow = createWorkflow(
      [inputNode('A', 'id-a'), inputNode('B', 'id-b'), inputNode('C', 'id-c')],
      {
        A: { main: [[connection('B')]] },
      },
    )

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R05'])

    expect(findings[0].nodeIndex).toBe(2)
  })

  it('reports disconnected groups through R06', () => {
    const workflow = createWorkflow(
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

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R06', 'R06'])

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('reports directed main cycles through R07', () => {
    const workflow = createWorkflow(
      [inputNode('A', 'id-a'), inputNode('B', 'id-b')],
      {
        A: { main: [[connection('B')]] },
        B: { main: [[connection('A')]] },
      },
    )

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R07'])

    expect(findings[0].nodeIndex).toBe(0)
  })

  it('reports duplicate connection entries through R08', () => {
    const workflow = createWorkflow(
      [inputNode('A', 'id-a'), inputNode('B', 'id-b')],
      {
        A: {
          main: [[connection('B'), connection('B')]],
        },
      },
    )

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R08'])

    expect(findings[0].nodeIndex).toBe(0)
  })

  it('does not reveal confidential workflow values', () => {
    const secret = 'SENTINEL_PRIVATE_AUDIT_123'

    const workflow = createWorkflow(
      [
        inputNode(secret, 'id-private', {
          token: secret,
        }),
        inputNode('   '),
      ],
      {
        [secret]: {
          main: [
            [
              connection(`missing-${secret}`),
              {
                node: '   ',
                type: 'main',
                index: 'invalid',
              },
            ],
          ],
        },
      },
    )

    const findings = audit(workflow)

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      'R03',
      'R04',
      'R09',
      'R10',
    ])

    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify raw or normalized workflow data', () => {
    const rawWorkflow = {
      nodes: [inputNode('A', 'id-a'), inputNode('B', 'id-b')],
      connections: {
        A: {
          main: [[connection('B'), connection('B')]],
        },
      },
    }

    const originalRaw = JSON.stringify(rawWorkflow)
    const normalized = createWorkflow(
      rawWorkflow.nodes,
      rawWorkflow.connections,
    )
    const originalNormalized = JSON.stringify(normalized)

    const findings = audit(normalized)

    expect(findings.map((finding) => finding.ruleId)).toEqual(['R08'])

    expect(JSON.stringify(rawWorkflow)).toBe(originalRaw)
    expect(JSON.stringify(normalized)).toBe(originalNormalized)
  })

  it('processes the official adapted n8n fixture', () => {
    const parsed = parseWorkflowJson(n8nDemoRaw)

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)
    const result = runRules(normalized, auditRules)

    expect(result.success).toBe(true)

    if (result.success) {
      for (const finding of result.findings) {
        expect(ruleIds).toContain(finding.ruleId)

        if (finding.nodeIndex !== undefined) {
          expect(finding.nodeIndex).toBeLessThan(normalized.nodes.length)
        }
      }
    }
  })

  it('keeps invalid JSON and invalid structures at the parser boundary', () => {
    const malformedJson = parseWorkflowJson('{"nodes":')

    expect(malformedJson.success).toBe(false)

    if (!malformedJson.success) {
      expect(malformedJson.error.code).toBe('INVALID_JSON')
    }

    const invalidStructure = parseWorkflowJson('{"nodes":[],"connections":[]}')

    expect(invalidStructure.success).toBe(false)

    if (!invalidStructure.success) {
      expect(invalidStructure.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('rejects executor exceptions without partial findings or secrets', () => {
    const secret = 'SENTINEL_PRIVATE_EXECUTION_ERROR'

    const workflow = createWorkflow(
      [inputNode('A', 'shared-id'), inputNode('B', 'shared-id')],
      {
        A: { main: [[connection('B')]] },
      },
    )

    const failingRule: AuditRule = {
      id: 'R10',
      description: 'Deliberate audit failure for testing.',

      run() {
        throw new Error(secret)
      },
    }

    const result = runRules(workflow, [...auditRules, failingRule])

    expect(result.success).toBe(false)
    expect(result).not.toHaveProperty('findings')
    expect(JSON.stringify(result)).not.toContain(secret)

    if (!result.success) {
      expect(result.error.code).toBe('RULE_EXECUTION_FAILED')
      expect(result.error.ruleId).toBe('R10')
    }
  })
})
