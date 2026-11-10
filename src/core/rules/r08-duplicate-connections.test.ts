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

describe('R08 - Duplicate connection entries', () => {
  it('has the expected rule metadata', () => {
    expect(r08DuplicateConnectionsRule.id).toBe('R08')
    expect(r08DuplicateConnectionsRule.description).toContain('connection')
  })

  it('returns no findings without connections', () => {
    const missingConnections = createWorkflow(['A', 'B'])
    const emptyConnections = createWorkflow(['A', 'B'], {})

    expect(r08DuplicateConnectionsRule.run(missingConnections)).toEqual([])

    expect(r08DuplicateConnectionsRule.run(emptyConnections)).toEqual([])
  })

  it('accepts distinct connections in one branch', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: {
        main: [[connection('B'), connection('C')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('detects an identical connection repeated once', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([
      {
        ruleId: 'R08',
        severity: 'warning',
        confidence: 'medium',
        title: 'Duplicate connection entry',
        description:
          'Connection source entry 1, group 1, branch 1, ' +
          'item 2 repeats item 1 in the same branch.',
        recommendation:
          'Review the repeated connection and remove redundant entries if unintentional.',
        nodeIndex: 0,
      },
    ])
  })

  it('reports every additional occurrence after the first', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B'), connection('B'), connection('B')]],
      },
    })

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings[0].description).toContain('item 2 repeats item 1')
    expect(findings[1].description).toContain('item 3 repeats item 1')
  })

  it('reports independent duplicate groups in traversal order', () => {
    const workflow = createWorkflow(['A', 'B', 'C', 'D'], {
      A: {
        main: [
          [connection('B'), connection('B')],
          null,
          [connection('C'), connection('C')],
        ],
      },
      C: {
        ai_tool: [[connection('D', 'ai_tool'), connection('D', 'ai_tool')]],
      },
    })

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 0, 2])
    expect(findings[0].description).toContain('branch 1')
    expect(findings[1].description).toContain('branch 3')
    expect(findings[2].description).toContain('source entry 2')
  })

  it('does not compare connections across output branches', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B')], null, [connection('B')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('distinguishes destination input types', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B', 'main'), connection('B', 'ai_tool')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('distinguishes destination input indices', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B', 'main', 0), connection('B', 'main', 1)]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('does not compare entries across output groups', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B')]],
        custom_output: [[connection('B')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('does not compare entries from different sources', () => {
    const workflow = createWorkflow(['A', 'B', 'C'], {
      A: {
        main: [[connection('C')]],
      },
      B: {
        main: [[connection('C')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('compares node and type strings exactly', () => {
    const workflow = createWorkflow(
      ['Source', 'Target', 'target', ' Target '],
      {
        Source: {
          main: [
            [
              connection('Target', 'main'),
              connection('target', 'main'),
              connection(' Target ', 'main'),
              connection('Target', 'MAIN'),
            ],
          ],
        },
      },
    )

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('detects duplicates in AI and custom groups', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        ai_languageModel: [
          [
            connection('B', 'ai_languageModel'),
            connection('B', 'ai_languageModel'),
          ],
        ],
        custom_output: [
          [connection('B', 'ai_tool'), connection('B', 'ai_tool')],
        ],
      },
    })

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.ruleId)).toEqual(['R08', 'R08'])
  })

  it('accepts null and empty branches', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [null, [], [connection('B')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('ignores extra fields and property order for identity', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [
          [
            {
              node: 'B',
              type: 'main',
              index: 0,
              metadata: 'first',
            },
            {
              index: 0,
              type: 'main',
              node: 'B',
              metadata: 'second',
            },
          ],
        ],
      },
    })

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('uses collision-safe keys for unusual strings', () => {
    const workflow = createWorkflow(['Source', 'B|C', 'B'], {
      Source: {
        main: [[connection('B|C', 'main'), connection('B', 'C|main')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('skips malformed sources, groups, and branches', () => {
    const malformedCases: Record<string, unknown>[] = [
      { A: null },
      { A: { main: 'invalid' } },
      { A: { main: [42] } },
      { A: { '': [] } },
      { '': { main: [] } },
      {
        A: {
          main: [[connection('B'), connection('B')]],
        },
        B: {
          main: 'invalid',
        },
      },
    ]

    for (const connections of malformedCases) {
      const workflow = createWorkflow(['A', 'B'], connections)

      expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
    }
  })

  it('skips malformed entries even after finding duplicates', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [
          [
            connection('B'),
            connection('B'),
            {
              node: 'B',
              type: 'main',
              index: 'invalid',
            },
          ],
        ],
      },
    })

    expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
  })

  it('skips invalid connection indices', () => {
    const invalidIndices = [
      -1,
      1.5,
      Number.NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]

    for (const index of invalidIndices) {
      const workflow = createWorkflow(['A', 'B'], {
        A: {
          main: [[connection('B', 'main', index)]],
        },
      })

      expect(r08DuplicateConnectionsRule.run(workflow)).toEqual([])
    }
  })

  it('skips dangling source and destination references', () => {
    const missingSource = createWorkflow(['A', 'B'], {
      Missing: {
        main: [[connection('B'), connection('B')]],
      },
    })

    const missingDestination = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('Missing'), connection('Missing')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(missingSource)).toEqual([])
    expect(r08DuplicateConnectionsRule.run(missingDestination)).toEqual([])
  })

  it('skips duplicate or blank node names', () => {
    const duplicateNames = createWorkflow(['A', 'A', 'B'], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    const blankName = createWorkflow(['A', 'B', '   '], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    expect(r08DuplicateConnectionsRule.run(duplicateNames)).toEqual([])

    expect(r08DuplicateConnectionsRule.run(blankName)).toEqual([])
  })

  it('does not expose original source or destination names', () => {
    const secret = 'SENTINEL_PRIVATE_CONNECTION_123'

    const workflow = createWorkflow([secret, 'Target'], {
      [secret]: {
        main: [[connection('Target'), connection('Target')]],
      },
    })

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['A', 'B'], {
      A: {
        main: [[connection('B'), connection('B')]],
      },
    })

    const originalContent = JSON.stringify(workflow)

    r08DuplicateConnectionsRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[' +
        '{"node":"constructor","type":"main","index":0},' +
        '{"node":"constructor","type":"main","index":0}' +
        ']]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(['__proto__', 'constructor'], connections)

    const findings = r08DuplicateConnectionsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('works with the parser, normalizer, and R01-R07', () => {
    const names = ['A', 'B', 'C']

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
        A: {
          main: [[connection('B'), connection('B'), connection('C')]],
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
    ])

    expect(result).toEqual({
      success: true,
      findings: [
        {
          ruleId: 'R08',
          severity: 'warning',
          confidence: 'medium',
          title: 'Duplicate connection entry',
          description:
            'Connection source entry 1, group 1, branch 1, ' +
            'item 2 repeats item 1 in the same branch.',
          recommendation:
            'Review the repeated connection and remove redundant entries if unintentional.',
          nodeIndex: 0,
        },
      ],
    })
  })
})
