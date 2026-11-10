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
import { runRules } from './run-rules'

function createWorkflow(
  names: string[],
  connections?: Record<string, unknown>,
): NormalizedWorkflow {
  return {
    nodes: names.map((name, nodeIndex) => ({
      nodeIndex,
      id: `id-${nodeIndex + 1}`,
      name,
      type: 'example.node',
    })),
    ...(connections === undefined ? {} : { connections }),
  }
}

function connection(node: string, type = 'main', index = 0) {
  return { node, type, index }
}

describe('R07 - Main connection cycles', () => {
  it('has the expected rule metadata', () => {
    expect(r07MainConnectionCyclesRule.id).toBe('R07')
    expect(r07MainConnectionCyclesRule.description).toContain('cycles')
  })

  it('returns no findings for an empty workflow', () => {
    expect(r07MainConnectionCyclesRule.run(createWorkflow([], {}))).toEqual([])
  })

  it('skips analysis when connections are unavailable', () => {
    const workflow = createWorkflow(['A', 'B'])

    expect(workflow.connections).toBeUndefined()
    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('accepts an acyclic main connection chain', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('C')]] },
    })

    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('does not confuse branching and merging with a cycle', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [[connection('B'), connection('C')]],
      },
      B: { main: [[connection('D')]] },
      C: { main: [[connection('D')]] },
    })

    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('detects a two-node directed cycle', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('A')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R07',
        severity: 'info',
        confidence: 'medium',
        title: 'Directed cycle in main connections',
        description:
          'Main connections contain a directed cycle involving 2 nodes.',
        recommendation:
          'Review whether the loop is intentional and has a reliable termination condition.',
        nodeIndex: 0,
      },
    ])
  })

  it('detects a three-node directed cycle', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('C')]] },
      C: { main: [[connection('A')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('3 nodes')
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('detects a self-loop on a single node', () => {
    const workflow = createWorkflow(['Loop'], {
      Loop: { main: [[connection('Loop')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('1 node.')
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('does not include downstream non-cyclic nodes in a cycle', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: { main: [[connection('B')]] },
      B: {
        main: [[connection('A'), connection('C')]],
      },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('2 nodes')
  })

  it('reports separate cycles in original node order', () => {
    const workflow = createWorkflow(['C', 'D', 'A', 'B'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('A')]] },
      C: { main: [[connection('D')]] },
      D: { main: [[connection('C')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('keeps cycles separate when connected by a one-way edge', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: { main: [[connection('B')]] },
      B: {
        main: [[connection('A'), connection('C')]],
      },
      C: { main: [[connection('D')]] },
      D: { main: [[connection('C')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('reports one finding for overlapping cycles', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: {
        main: [[connection('B'), connection('C')]],
      },
      B: { main: [[connection('C')]] },
      C: { main: [[connection('A')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain('3 nodes')
  })

  it('does not count cycles formed only by AI connections', () => {
    const workflow = createWorkflow(['Model', 'Agent'], {
      Model: {
        ai_languageModel: [[connection('Agent', 'ai_languageModel')]],
      },
      Agent: {
        ai_tool: [[connection('Model', 'ai_tool')]],
      },
    })

    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('does not combine main and AI edges into a main cycle', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: { main: [[connection('B')]] },
      B: {
        ai_tool: [[connection('A', 'ai_tool')]],
      },
    })

    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('does not treat null or empty branches as edges', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [null, [], [connection('B')]],
      },
      B: {
        main: [null, []],
      },
    })

    expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
  })

  it('does not duplicate findings for parallel connections', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
      B: { main: [[connection('A')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
  })

  it('skips duplicate and blank node names', () => {
    const duplicateNames = createWorkflow(['A', 'A'], {
      A: { main: [[connection('A')]] },
    })

    const blankName = createWorkflow(['A', '   '], {
      A: { main: [[connection('A')]] },
    })

    expect(r07MainConnectionCyclesRule.run(duplicateNames)).toEqual([])

    expect(r07MainConnectionCyclesRule.run(blankName)).toEqual([])
  })

  it('skips malformed sources, groups, branches, and entries', () => {
    const malformedCases: Record<string, unknown>[] = [
      { A: null },
      { A: { main: 'invalid' } },
      { A: { main: [42] } },
      { A: { main: [[null]] } },
      { A: { main: [[{ node: 'B', type: 'main' }]] } },
      {
        A: {
          main: [[connection('B')]],
          ai_tool: 'invalid',
        },
      },
    ]

    for (const connections of malformedCases) {
      const workflow = createWorkflow(['A', 'B'], connections)

      expect(r07MainConnectionCyclesRule.run(workflow)).toEqual([])
    }
  })

  it('skips dangling source and destination references', () => {
    const missingSource = createWorkflow(['A', 'B'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('A')]] },
      Missing: { main: [] },
    })

    const missingDestination = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B'), connection('Missing')]],
      },
      B: { main: [[connection('A')]] },
    })

    expect(r07MainConnectionCyclesRule.run(missingSource)).toEqual([])

    expect(r07MainConnectionCyclesRule.run(missingDestination)).toEqual([])
  })

  it('does not expose original node names', () => {
    const secret = 'SENTINEL_PRIVATE_CYCLE_123'

    const workflow = createWorkflow(['A', secret], {
      A: { main: [[connection(secret)]] },
      [secret]: { main: [[connection('A')]] },
    })

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('A')]] },
    })

    const originalContent = JSON.stringify(workflow)

    r07MainConnectionCyclesRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[{"node":"constructor",' +
        '"type":"main","index":0}]]},' +
        '"constructor":{"main":[[{"node":"__proto__",' +
        '"type":"main","index":0}]]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(['__proto__', 'constructor'], connections)

    const findings = r07MainConnectionCyclesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('works with the parser, normalizer, and R01-R06', () => {
    const names = ['A', 'B', 'C', 'D']

    const rawWorkflow = {
      nodes: names.map((name, index) => ({
        id: `id-${index + 1}`,
        name,
        type: 'example.node',
        typeVersion: 1,
        position: [index * 100, 0],
        parameters: {},
      })),
      connections: {
        A: { main: [[connection('B')]] },
        B: { main: [[connection('C')]] },
        C: {
          main: [[connection('A'), connection('D')]],
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
    ])

    expect(result).toEqual({
      success: true,
      findings: [
        {
          ruleId: 'R07',
          severity: 'info',
          confidence: 'medium',
          title: 'Directed cycle in main connections',
          description:
            'Main connections contain a directed cycle involving 3 nodes.',
          recommendation:
            'Review whether the loop is intentional and has a reliable termination condition.',
          nodeIndex: 0,
        },
      ],
    })
  })
})
