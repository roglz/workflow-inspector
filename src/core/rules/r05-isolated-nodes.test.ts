import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r01DuplicateNodeIdsRule } from './r01-duplicate-node-ids'
import { r02DuplicateNodeNamesRule } from './r02-duplicate-node-names'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { r04MalformedConnectionsRule } from './r04-malformed-connections'
import { r05IsolatedNodesRule } from './r05-isolated-nodes'
import { runRules } from './run-rules'

function createWorkflow(
  names: string[],
  connections?: Record<string, unknown>,
): NormalizedWorkflow {
  return {
    nodes: names.map((name, nodeIndex) => ({
      nodeIndex,
      id: `node-${nodeIndex + 1}`,
      name,
      type: 'example.node',
    })),
    ...(connections === undefined ? {} : { connections }),
  }
}

function connection(node: string, type = 'main', index = 0) {
  return { node, type, index }
}

describe('R05 - Isolated nodes', () => {
  it('has the expected rule metadata', () => {
    expect(r05IsolatedNodesRule.id).toBe('R05')
    expect(r05IsolatedNodesRule.description).toContain('isolated')
  })

  it('ignores workflows with fewer than two nodes', () => {
    expect(r05IsolatedNodesRule.run(createWorkflow([], {}))).toEqual([])

    expect(r05IsolatedNodesRule.run(createWorkflow(['Only'], {}))).toEqual([])
  })

  it('skips analysis when connections are unavailable', () => {
    const workflow = createWorkflow(['A', 'B'])

    expect(workflow.connections).toBeUndefined()
    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('reports all nodes when connections are explicitly empty', () => {
    const workflow = createWorkflow(['A', 'B'], {})

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R05',
        severity: 'warning',
        confidence: 'medium',
        title: 'Isolated node',
        description:
          'Node at position 1 has no incoming or outgoing connections.',
        recommendation:
          'Review whether this node should be connected or is intentionally standalone.',
        nodeIndex: 0,
      },
      {
        ruleId: 'R05',
        severity: 'warning',
        confidence: 'medium',
        title: 'Isolated node',
        description:
          'Node at position 2 has no incoming or outgoing connections.',
        recommendation:
          'Review whether this node should be connected or is intentionally standalone.',
        nodeIndex: 1,
      },
    ])
  })

  it('detects one isolated node beside a connected pair', () => {
    const workflow = createWorkflow(['Start', 'Target', 'Unused'], {
      Start: {
        main: [[connection('Target')]],
      },
    })

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(2)
    expect(findings[0].severity).toBe('warning')
    expect(findings[0].confidence).toBe('medium')
  })

  it('does not flag nodes in a connected chain', () => {
    const workflow = createWorkflow(['Start', 'Middle', 'End'], {
      Start: {
        main: [[connection('Middle')]],
      },
      Middle: {
        main: [[connection('End')]],
      },
    })

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('counts AI and custom connections', () => {
    const workflow = createWorkflow(['Model', 'Tool', 'Agent'], {
      Model: {
        ai_languageModel: [[connection('Agent', 'ai_languageModel')]],
      },
      Tool: {
        custom_output: [[connection('Agent', 'ai_tool')]],
      },
    })

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('does not count null or empty branches as connections', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [null, []],
      },
    })

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 1])
  })

  it('counts a self-loop as a connection', () => {
    const workflow = createWorkflow(['Loop', 'Unused'], {
      Loop: {
        main: [[connection('Loop')]],
      },
    })

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1])
  })

  it('preserves the original order of isolated nodes', () => {
    const workflow = createWorkflow(
      ['Unused A', 'Start', 'Target', 'Unused B'],
      {
        Start: {
          main: [[connection('Target')]],
        },
      },
    )

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 3])
  })

  it('skips analysis when node names are duplicated', () => {
    const workflow = createWorkflow(['Shared', 'Shared', 'Unused'], {})

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('skips analysis when node names are blank', () => {
    const workflow = createWorkflow(['Source', '   ', 'Target'], {})

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('skips malformed sources, groups, and branches', () => {
    const invalidGraphs: Record<string, unknown>[] = [
      { A: null },
      { A: { main: 'invalid' } },
      { A: { main: [123] } },
      { A: { '': [] } },
    ]

    for (const connections of invalidGraphs) {
      const workflow = createWorkflow(['A', 'B'], connections)

      expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
    }
  })

  it('skips malformed entries even with valid siblings', () => {
    const workflow = createWorkflow(['A', 'B', 'Unused'], {
      A: {
        main: [
          [connection('B'), { node: 'B', type: 'main', index: 'invalid' }],
        ],
      },
    })

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('skips analysis when a node reference is dangling', () => {
    const missingDestination = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('Missing')]],
      },
    })

    const missingSource = createWorkflow(['A', 'B'], {
      Missing: {
        main: [[connection('A')]],
      },
    })

    expect(r05IsolatedNodesRule.run(missingDestination)).toEqual([])

    expect(r05IsolatedNodesRule.run(missingSource)).toEqual([])
  })

  it('compares names exactly', () => {
    const workflow = createWorkflow(['Start', 'Target'], {
      start: {
        main: [[connection('Target')]],
      },
    })

    expect(r05IsolatedNodesRule.run(workflow)).toEqual([])
  })

  it('does not expose original node names', () => {
    const secret = 'SENTINEL_PRIVATE_NODE_123'

    const workflow = createWorkflow(['Start', 'Target', secret], {
      Start: {
        main: [[connection('Target')]],
      },
    })

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['Start', 'Target', 'Unused'], {
      Start: {
        main: [[connection('Target')]],
      },
    })

    const originalContent = JSON.stringify(workflow)

    r05IsolatedNodesRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[{"node":"constructor",' +
        '"type":"main","index":0}]]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(
      ['__proto__', 'constructor', 'Unused'],
      connections,
    )

    const findings = r05IsolatedNodesRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([2])
  })

  it('works with the parser, normalizer, and all existing rules', () => {
    const rawWorkflow = {
      nodes: [
        {
          id: 'id-1',
          name: 'Start',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'id-2',
          name: 'Target',
          type: 'example.node',
          typeVersion: 1,
          position: [100, 0],
          parameters: {},
        },
        {
          id: 'id-3',
          name: 'Unused',
          type: 'example.node',
          typeVersion: 1,
          position: [200, 0],
          parameters: {},
        },
      ],
      connections: {
        Start: {
          main: [[connection('Target')]],
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
    ])

    expect(result).toEqual({
      success: true,
      findings: [
        {
          ruleId: 'R05',
          severity: 'warning',
          confidence: 'medium',
          title: 'Isolated node',
          description:
            'Node at position 3 has no incoming or outgoing connections.',
          recommendation:
            'Review whether this node should be connected or is intentionally standalone.',
          nodeIndex: 2,
        },
      ],
    })
  })
})
