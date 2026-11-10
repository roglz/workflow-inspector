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

function twoGroupsConnections(): Record<string, unknown> {
  return {
    A: {
      main: [[connection('B')]],
    },
    C: {
      main: [[connection('D')]],
    },
  }
}

function twoGroupsWorkflow(): NormalizedWorkflow {
  return createWorkflow(['A', 'B', 'C', 'D'], twoGroupsConnections())
}

describe('R06 - Disconnected node groups', () => {
  it('has the expected rule metadata', () => {
    expect(r06DisconnectedGroupsRule.id).toBe('R06')
    expect(r06DisconnectedGroupsRule.description).toContain('disconnected')
  })

  it('returns no findings for fewer than four nodes', () => {
    expect(r06DisconnectedGroupsRule.run(createWorkflow([], {}))).toEqual([])

    expect(
      r06DisconnectedGroupsRule.run(createWorkflow(['A', 'B', 'C'], {})),
    ).toEqual([])
  })

  it('skips analysis when connections are unavailable', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'])

    expect(workflow.connections).toBeUndefined()
    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('does not report individual isolated nodes', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {})

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('does not report a single connected component', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: { main: [[connection('B')]] },
      B: { main: [[connection('C')]] },
      C: { main: [[connection('D')]] },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('detects two separate connected groups', () => {
    const findings = r06DisconnectedGroupsRule.run(twoGroupsWorkflow())

    expect(findings).toEqual([
      {
        ruleId: 'R06',
        severity: 'info',
        confidence: 'medium',
        title: 'Disconnected node group',
        description:
          'A group of 2 connected nodes is separate ' +
          'from at least one other multi-node group.',
        recommendation:
          'Review whether these separate branches are intentional or should be connected.',
        nodeIndex: 0,
      },
      {
        ruleId: 'R06',
        severity: 'info',
        confidence: 'medium',
        title: 'Disconnected node group',
        description:
          'A group of 2 connected nodes is separate ' +
          'from at least one other multi-node group.',
        recommendation:
          'Review whether these separate branches are intentional or should be connected.',
        nodeIndex: 2,
      },
    ])
  })

  it('reports three groups in original node order', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D', 'E', 'F', 'G'], {
      A: { main: [[connection('B')]] },
      C: { main: [[connection('D')]] },
      D: { main: [[connection('E')]] },
      F: { main: [[connection('G')]] },
    })

    const findings = r06DisconnectedGroupsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2, 5])
    expect(findings[1].description).toContain('3 connected nodes')
  })

  it('leaves individual isolated nodes to R05', () => {
    const workflow = createWorkflow(['A', 'B', 'Unused'], {
      A: { main: [[connection('B')]] },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('ignores connection direction when grouping nodes', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: { main: [[connection('C')]] },
      B: { main: [[connection('C')]] },
      C: { main: [[connection('D')]] },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('counts AI and custom connections between groups', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [[connection('B')]],
      },
      B: {
        ai_languageModel: [[connection('C', 'ai_languageModel')]],
      },
      C: {
        custom_output: [[connection('D', 'ai_tool')]],
      },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('does not treat null or empty branches as edges', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [[connection('B')], null, []],
      },
      C: {
        main: [[], [connection('D')]],
      },
    })

    const findings = r06DisconnectedGroupsRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('does not count self-loops as multi-node groups', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: { main: [[connection('A')]] },
      B: { main: [[connection('B')]] },
      C: { main: [[connection('D')]] },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('skips graphs with duplicate or blank node names', () => {
    const duplicateNames = createWorkflow(
      ['A', 'B', 'C', 'C', 'D'],
      twoGroupsConnections(),
    )

    const blankName = createWorkflow(
      ['A', 'B', 'C', 'D', '   '],
      twoGroupsConnections(),
    )

    expect(r06DisconnectedGroupsRule.run(duplicateNames)).toEqual([])

    expect(r06DisconnectedGroupsRule.run(blankName)).toEqual([])
  })

  it('skips dangling source and destination references', () => {
    const missingSource = createWorkflow(['A', 'B', 'C', 'D'], {
      ...twoGroupsConnections(),
      Missing: {
        main: [[connection('A')]],
      },
    })

    const missingDestination = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [[connection('Missing')]],
      },
      C: {
        main: [[connection('D')]],
      },
    })

    expect(r06DisconnectedGroupsRule.run(missingSource)).toEqual([])

    expect(r06DisconnectedGroupsRule.run(missingDestination)).toEqual([])
  })

  it('skips malformed sources, groups, branches, and entries', () => {
    const malformedCases: Record<string, unknown>[] = [
      {
        ...twoGroupsConnections(),
        B: null,
      },
      {
        ...twoGroupsConnections(),
        B: { main: 'invalid' },
      },
      {
        ...twoGroupsConnections(),
        B: { main: [42] },
      },
      {
        ...twoGroupsConnections(),
        B: { '': [] },
      },
      {
        ...twoGroupsConnections(),
        B: { main: [[null]] },
      },
      {
        ...twoGroupsConnections(),
        B: {
          main: [
            [
              {
                node: 'A',
                type: 'main',
                index: -1,
              },
            ],
          ],
        },
      },
    ]

    for (const connections of malformedCases) {
      const workflow = createWorkflow(['A', 'B', 'C', 'D'], connections)

      expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
    }
  })

  it('compares source names exactly', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      ...twoGroupsConnections(),
      a: {
        main: [[connection('B')]],
      },
    })

    expect(r06DisconnectedGroupsRule.run(workflow)).toEqual([])
  })

  it('accepts additional fields on valid connections', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [
          [
            {
              ...connection('B'),
              additionalMetadata: true,
            },
          ],
        ],
      },
      C: {
        main: [[connection('D')]],
      },
    })

    const findings = r06DisconnectedGroupsRule.run(workflow)

    expect(findings).toHaveLength(2)
  })

  it('does not expose original node names', () => {
    const secret = 'SENTINEL_PRIVATE_NODE_R06'

    const workflow = createWorkflow(['A', secret, 'C', 'D'], {
      A: {
        main: [[connection(secret)]],
      },
      C: {
        main: [[connection('D')]],
      },
    })

    const findings = r06DisconnectedGroupsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = twoGroupsWorkflow()
    const originalContent = JSON.stringify(workflow)

    r06DisconnectedGroupsRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[{"node":"constructor",' +
        '"type":"main","index":0}]]},' +
        '"Other":{"main":[[{"node":"Target",' +
        '"type":"main","index":0}]]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(
      ['__proto__', 'constructor', 'Other', 'Target'],
      connections,
    )

    const findings = r06DisconnectedGroupsRule.run(workflow)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 2])
  })

  it('works with the parser, normalizer, and R01-R05', () => {
    const rawWorkflow = {
      nodes: [
        {
          id: 'id-1',
          name: 'Start A',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'id-2',
          name: 'Process A',
          type: 'example.node',
          typeVersion: 1,
          position: [100, 0],
          parameters: {},
        },
        {
          id: 'id-3',
          name: 'Start B',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 200],
          parameters: {},
        },
        {
          id: 'id-4',
          name: 'Process B',
          type: 'example.node',
          typeVersion: 1,
          position: [100, 200],
          parameters: {},
        },
      ],
      connections: {
        'Start A': {
          main: [[connection('Process A')]],
        },
        'Start B': {
          main: [[connection('Process B')]],
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
    ])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(2)

      expect(result.findings.map((finding) => finding.ruleId)).toEqual([
        'R06',
        'R06',
      ])

      expect(result.findings.map((finding) => finding.nodeIndex)).toEqual([
        0, 2,
      ])

      expect(
        result.findings.every(
          (finding) =>
            finding.severity === 'info' && finding.confidence === 'medium',
        ),
      ).toBe(true)
    }
  })
})
