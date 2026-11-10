import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { runRules } from './run-rules'
import { r02DuplicateNodeNamesRule } from './r02-duplicate-node-names'

function createWorkflow(names: string[]): NormalizedWorkflow {
  return {
    nodes: names.map((name, nodeIndex) => ({
      nodeIndex,
      id: `node-${nodeIndex + 1}`,
      name,
      type: 'example.node',
    })),
  }
}

describe('R02 - Duplicate node names', () => {
  it('has the expected rule metadata', () => {
    expect(r02DuplicateNodeNamesRule.id).toBe('R02')
    expect(r02DuplicateNodeNamesRule.description).toContain('name')
  })

  it('returns no findings for empty or unique workflows', () => {
    expect(r02DuplicateNodeNamesRule.run(createWorkflow([]))).toEqual([])

    expect(
      r02DuplicateNodeNamesRule.run(
        createWorkflow(['First Node', 'Second Node']),
      ),
    ).toEqual([])
  })

  it('detects one duplicated node name', () => {
    const workflow = createWorkflow([
      'HTTP Request',
      'Edit Fields',
      'HTTP Request',
    ])

    const findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R02',
        severity: 'error',
        confidence: 'high',
        title: 'Duplicate node name',
        description:
          'Node at position 3 shares a name ' + 'with node at position 1.',
        recommendation: 'Rename the affected nodes so each has a unique name.',
        nodeIndex: 2,
      },
    ])
  })

  it('reports every additional occurrence of a name', () => {
    const workflow = createWorkflow([
      'Repeated Name',
      'Repeated Name',
      'Repeated Name',
    ])

    const findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 2])
  })

  it('detects independent duplicate groups in node order', () => {
    const workflow = createWorkflow(['Node A', 'Node B', 'Node A', 'Node B'])

    const findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([2, 3])
  })

  it('compares names exactly without normalizing them', () => {
    const workflow = createWorkflow([
      'HTTP Request',
      'http request',
      ' HTTP Request',
      'HTTP Request ',
    ])

    expect(r02DuplicateNodeNamesRule.run(workflow)).toEqual([])
  })

  it('detects repeated empty and whitespace-only names', () => {
    const workflow = createWorkflow(['', '', ' ', ' '])

    const findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 3])
  })

  it('does not report duplicated identifiers as R02 findings', () => {
    const workflow = createWorkflow(['First Node', 'Second Node'])

    workflow.nodes[1].id = workflow.nodes[0].id

    expect(r02DuplicateNodeNamesRule.run(workflow)).toEqual([])
  })

  it('does not expose duplicated node names', () => {
    const secret = 'SENTINEL_PRIVATE_123'

    const workflow = createWorkflow([secret, secret])

    const findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['Same Name', 'Same Name'])

    const originalContent = JSON.stringify(workflow)

    r02DuplicateNodeNamesRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('works with the parser, normalizer, and rule executor', () => {
    const rawWorkflow = {
      nodes: [
        {
          id: 'id-1',
          name: 'Shared Name',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'id-2',
          name: 'Shared Name',
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

    const result = runRules(normalized, [r02DuplicateNodeNamesRule])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe('R02')
      expect(result.findings[0].severity).toBe('error')
      expect(result.findings[0].confidence).toBe('high')
      expect(result.findings[0].nodeIndex).toBe(1)
    }
  })
})
