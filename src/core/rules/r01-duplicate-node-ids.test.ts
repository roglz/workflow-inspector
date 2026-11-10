import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { runRules } from './run-rules'
import { r01DuplicateNodeIdsRule } from './r01-duplicate-node-ids'

function createWorkflow(ids: Array<string | undefined>): NormalizedWorkflow {
  return {
    nodes: ids.map((id, nodeIndex) => ({
      nodeIndex,
      id,
      name: `Node ${nodeIndex + 1}`,
      type: 'example.node',
    })),
  }
}

describe('R01 - Duplicate node identifiers', () => {
  it('has the expected rule metadata', () => {
    expect(r01DuplicateNodeIdsRule.id).toBe('R01')
    expect(r01DuplicateNodeIdsRule.description).toContain('identifier')
  })

  it('returns no findings for empty or unique workflows', () => {
    expect(r01DuplicateNodeIdsRule.run(createWorkflow([]))).toEqual([])

    expect(
      r01DuplicateNodeIdsRule.run(createWorkflow(['id-1', 'id-2', 'id-3'])),
    ).toEqual([])
  })

  it('detects one duplicated identifier', () => {
    const workflow = createWorkflow([
      'duplicate-id',
      'unique-id',
      'duplicate-id',
    ])

    const findings = r01DuplicateNodeIdsRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R01',
        severity: 'error',
        confidence: 'high',
        title: 'Duplicate node identifier',
        description:
          'Node at position 3 shares an identifier ' +
          'with node at position 1.',
        recommendation:
          'Review the affected nodes and ensure each has a unique identifier.',
        nodeIndex: 2,
      },
    ])
  })

  it('reports every additional occurrence of an identifier', () => {
    const workflow = createWorkflow(['same-id', 'same-id', 'same-id'])

    const findings = r01DuplicateNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(2)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 2])
  })

  it('detects independent duplicate groups in node order', () => {
    const workflow = createWorkflow(['id-a', 'id-b', 'id-a', 'id-b'])

    const findings = r01DuplicateNodeIdsRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([2, 3])
  })

  it('ignores missing, empty, and whitespace-only identifiers', () => {
    const workflow = createWorkflow([undefined, undefined, '', '', ' ', '\t'])

    expect(r01DuplicateNodeIdsRule.run(workflow)).toEqual([])
  })

  it('compares identifiers exactly without normalizing them', () => {
    const workflow = createWorkflow(['ABC', 'abc', ' ABC', 'ABC '])

    expect(r01DuplicateNodeIdsRule.run(workflow)).toEqual([])
  })

  it('does not detect duplicated names as R01 findings', () => {
    const workflow = createWorkflow(['id-1', 'id-2'])

    workflow.nodes[0].name = 'Same Name'
    workflow.nodes[1].name = 'Same Name'

    expect(r01DuplicateNodeIdsRule.run(workflow)).toEqual([])
  })

  it('does not expose duplicated identifier values', () => {
    const secret = 'SENTINEL_PRIVATE_123'

    const workflow = createWorkflow([secret, secret])

    const findings = r01DuplicateNodeIdsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['same-id', 'same-id'])
    const original = JSON.stringify(workflow)

    r01DuplicateNodeIdsRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(original)
  })

  it('works with the parser, normalizer, and rule executor', () => {
    const rawWorkflow = {
      nodes: [
        {
          id: 'duplicate-id',
          name: 'First Node',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'duplicate-id',
          name: 'Second Node',
          type: 'example.node',
          typeVersion: 1,
          position: [100, 0],
          parameters: {},
        },
      ],
      connections: {},
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    const result = runRules(normalized, [r01DuplicateNodeIdsRule])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe('R01')
      expect(result.findings[0].nodeIndex).toBe(1)
    }
  })
})
