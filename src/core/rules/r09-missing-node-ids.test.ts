import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r01DuplicateNodeIdsRule } from './r01-duplicate-node-ids'
import { r02DuplicateNodeNamesRule } from './r02-duplicate-node-names'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { r04MalformedConnectionsRule } from './r04-malformed-connections'
import { r05IsolatedNodesRule } from './r05-isolated-nodes'
import { r06DisconnectedGroupsRule } from './r06-disconnected-groups'
import { r07MainConnectionCyclesRule } from './r07-main-connection-cycles'
import { r08DuplicateConnectionsRule } from './r08-duplicate-connections'
import { r09MissingNodeIdsRule } from './r09-missing-node-ids'
import { runRules } from './run-rules'

function createWorkflow(
  ids: Array<string | undefined>,
  connections?: Record<string, unknown>,
): NormalizedWorkflow {
  return {
    nodes: ids.map((id, nodeIndex) => ({
      nodeIndex,
      id,
      name: `Node ${nodeIndex + 1}`,
      type: 'example.node',
    })),
    ...(connections === undefined ? {} : { connections }),
  }
}

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

describe('R09 - Missing or blank node IDs', () => {
  it('has the expected rule metadata', () => {
    expect(r09MissingNodeIdsRule.id).toBe('R09')
    expect(r09MissingNodeIdsRule.description).toContain('identifiers')
  })

  it('returns no findings for an empty workflow', () => {
    expect(r09MissingNodeIdsRule.run(createWorkflow([]))).toEqual([])
  })

  it('accepts non-blank identifiers', () => {
    const workflow = createWorkflow(['node-1', 'node-2', 'node-3'])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([])
  })

  it('detects a missing node identifier', () => {
    const workflow = createWorkflow([undefined])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([
      {
        ruleId: 'R09',
        severity: 'warning',
        confidence: 'high',
        title: 'Missing or blank node identifier',
        description: 'Node at position 1 is missing an identifier.',
        recommendation:
          'Assign a non-blank identifier that is unique within the workflow.',
        nodeIndex: 0,
      },
    ])
  })

  it('detects an empty node identifier', () => {
    const workflow = createWorkflow([''])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([
      {
        ruleId: 'R09',
        severity: 'warning',
        confidence: 'high',
        title: 'Missing or blank node identifier',
        description: 'Node at position 1 has a blank identifier.',
        recommendation:
          'Assign a non-blank identifier that is unique within the workflow.',
        nodeIndex: 0,
      },
    ])
  })

  it('detects an identifier containing only spaces', () => {
    const workflow = createWorkflow(['   '])

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('blank identifier')
  })

  it('detects identifiers containing only tabs or newlines', () => {
    const workflow = createWorkflow(['\t', '\n', ' \t\n '])

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(
      findings.every((finding) =>
        finding.description.includes('blank identifier'),
      ),
    ).toBe(true)
  })

  it('reports multiple invalid identifiers in original order', () => {
    const workflow = createWorkflow([
      'valid-1',
      undefined,
      '',
      'valid-2',
      '   ',
    ])

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 2, 4])
    expect(findings.map((finding) => finding.description)).toEqual([
      'Node at position 2 is missing an identifier.',
      'Node at position 3 has a blank identifier.',
      'Node at position 5 has a blank identifier.',
    ])
  })

  it('reports each missing identifier separately', () => {
    const workflow = createWorkflow([undefined, undefined, undefined])

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 1, 2])
  })

  it('accepts identifiers with non-blank content and outer spaces', () => {
    const workflow = createWorkflow([' node-1 ', '\tvalid-id\n'])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([])
  })

  it('does not require identifiers to use the UUID format', () => {
    const workflow = createWorkflow(['0', '123', 'ABC', 'node/custom-id'])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([])
  })

  it('leaves duplicate non-blank identifiers to R01', () => {
    const workflow = createWorkflow(['same-id', 'same-id'])

    expect(r09MissingNodeIdsRule.run(workflow)).toEqual([])

    const r01Findings = r01DuplicateNodeIdsRule.run(workflow)

    expect(r01Findings).toHaveLength(1)
    expect(r01Findings[0].ruleId).toBe('R01')
  })

  it('does not suppress findings when node names are duplicated', () => {
    const workflow = createWorkflow([undefined, 'valid-id'])

    workflow.nodes[1].name = workflow.nodes[0].name

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('does not depend on connections being available or valid', () => {
    const withoutConnections = createWorkflow([undefined])

    const withEmptyConnections = createWorkflow([undefined], {})

    const withMalformedConnections = createWorkflow([undefined], {
      'Node 1': null,
    })

    for (const workflow of [
      withoutConnections,
      withEmptyConnections,
      withMalformedConnections,
    ]) {
      const findings = r09MissingNodeIdsRule.run(workflow)

      expect(findings).toHaveLength(1)
      expect(findings[0].ruleId).toBe('R09')
    }
  })

  it('does not reveal original identifiers or node names', () => {
    const secretName = 'SENTINEL_PRIVATE_NODE_R09'
    const secretId = 'SENTINEL_PRIVATE_ID_R09'

    const workflow = createWorkflow(['   ', secretId])

    workflow.nodes[0].name = secretName

    const findings = r09MissingNodeIdsRule.run(workflow)
    const serialized = JSON.stringify(findings)

    expect(findings).toHaveLength(1)
    expect(serialized).not.toContain(secretName)
    expect(serialized).not.toContain(secretId)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow([undefined, '', 'valid-id'], {
      'Node 1': {},
    })

    const originalContent = JSON.stringify(workflow)

    r09MissingNodeIdsRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('locates affected nodes after valid predecessors', () => {
    const workflow = createWorkflow([
      'valid-a',
      'valid-b',
      undefined,
      'valid-c',
    ])

    const findings = r09MissingNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(2)
    expect(findings[0].description).toContain('position 3')
  })

  it('works with the parser and normalizer for a missing ID', () => {
    const rawWorkflow = {
      nodes: [inputNode('Source'), inputNode('Target', 'target-id')],
      connections: {},
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    expect(normalized.nodes[0].id).toBeUndefined()

    const findings = r09MissingNodeIdsRule.run(normalized)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('works with the parser and normalizer for a blank ID', () => {
    const rawWorkflow = {
      nodes: [inputNode('Source', '   '), inputNode('Target', 'target-id')],
      connections: {},
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)
    const findings = r09MissingNodeIdsRule.run(normalized)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('blank identifier')
  })

  it('works with the parser, normalizer, and R01-R08', () => {
    const rawWorkflow = {
      nodes: [inputNode('Source'), inputNode('Target', 'target-id')],
      connections: {
        Source: {
          main: [
            [
              {
                node: 'Target',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    const result = runRules(normalized, [
      r01DuplicateNodeIdsRule,
      r02DuplicateNodeNamesRule,
      r03DanglingNodeReferencesRule,
      r04MalformedConnectionsRule,
      r05IsolatedNodesRule,
      r06DisconnectedGroupsRule,
      r07MainConnectionCyclesRule,
      r08DuplicateConnectionsRule,
      r09MissingNodeIdsRule,
    ])

    expect(result).toEqual({
      success: true,
      findings: [
        {
          ruleId: 'R09',
          severity: 'warning',
          confidence: 'high',
          title: 'Missing or blank node identifier',
          description: 'Node at position 1 is missing an identifier.',
          recommendation:
            'Assign a non-blank identifier that is unique within the workflow.',
          nodeIndex: 0,
        },
      ],
    })
  })
})
