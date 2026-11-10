import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { runRules } from './run-rules'

function createWorkflow(
  names: string[],
  connections: Record<string, unknown> = {},
): NormalizedWorkflow {
  return {
    nodes: names.map((name, nodeIndex) => ({
      nodeIndex,
      id: `node-${nodeIndex + 1}`,
      name,
      type: 'example.node',
    })),
    connections,
  }
}

function connection(node: string, type = 'main', index = 0) {
  return { node, type, index }
}

describe('R03 - Dangling node references', () => {
  it('has the expected rule metadata', () => {
    expect(r03DanglingNodeReferencesRule.id).toBe('R03')
    expect(r03DanglingNodeReferencesRule.description).toContain('connections')
  })

  it('returns no findings without connections', () => {
    const emptyWorkflow = createWorkflow([])
    const workflowWithoutConnections = createWorkflow(['Source'])

    delete workflowWithoutConnections.connections

    expect(r03DanglingNodeReferencesRule.run(emptyWorkflow)).toEqual([])

    expect(
      r03DanglingNodeReferencesRule.run(workflowWithoutConnections),
    ).toEqual([])
  })

  it('accepts valid main connections and null branches', () => {
    const workflow = createWorkflow(['Source', 'Target'], {
      Source: {
        main: [[connection('Target')], null, []],
      },
    })

    expect(r03DanglingNodeReferencesRule.run(workflow)).toEqual([])
  })

  it('accepts AI and other connection groups', () => {
    const workflow = createWorkflow(['Model', 'Tool', 'Agent'], {
      Model: {
        ai_languageModel: [[connection('Agent', 'ai_languageModel')]],
      },
      Tool: {
        custom_output: [[connection('Agent', 'ai_tool')]],
      },
    })

    expect(r03DanglingNodeReferencesRule.run(workflow)).toEqual([])
  })

  it('detects a missing source node', () => {
    const workflow = createWorkflow(['Existing'], {
      'Missing Source': {
        main: [[connection('Existing')]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R03',
        severity: 'error',
        confidence: 'high',
        title: 'Connection source node does not exist',
        description:
          'Connection source entry 1 references a node that does not exist.',
        recommendation:
          'Update the connection source to an existing node name or remove the invalid connection.',
      },
    ])
  })

  it('detects a missing destination node', () => {
    const workflow = createWorkflow(['Source'], {
      Source: {
        main: [[connection('Missing Target')]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toEqual([
      {
        ruleId: 'R03',
        severity: 'error',
        confidence: 'high',
        title: 'Connection destination node does not exist',
        description:
          'Connection from source entry 1, output group 1, branch 1, item 1 ' +
          'references a destination node that does not exist.',
        recommendation:
          'Update the destination reference to an existing node name or remove the connection.',
        nodeIndex: 0,
      },
    ])
  })

  it('preserves the order of multiple missing destinations', () => {
    const workflow = createWorkflow(['Source', 'Existing'], {
      Source: {
        main: [
          [connection('Missing A'), connection('Existing')],
          null,
          [connection('Missing B')],
        ],
        ai_tool: [[connection('Missing C', 'ai_tool')]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(3)

    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 0, 0])

    expect(findings.map((finding) => finding.description)).toEqual([
      'Connection from source entry 1, output group 1, branch 1, item 1 ' +
        'references a destination node that does not exist.',
      'Connection from source entry 1, output group 1, branch 3, item 1 ' +
        'references a destination node that does not exist.',
      'Connection from source entry 1, output group 2, branch 1, item 1 ' +
        'references a destination node that does not exist.',
    ])
  })

  it('does not cascade destination findings when source is missing', () => {
    const workflow = createWorkflow(['Existing'], {
      'Missing Source': {
        main: [[connection('Missing Target')]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].title).toBe('Connection source node does not exist')
  })

  it('compares node names exactly', () => {
    const workflow = createWorkflow(['Source', 'Exact Target'], {
      Source: {
        main: [
          [
            connection('exact target'),
            connection(' Exact Target '),
            connection('Exact Target'),
          ],
        ],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(findings.every((finding) => finding.ruleId === 'R03')).toBe(true)
  })

  it('skips malformed source blocks and connection groups', () => {
    const workflow = createWorkflow(['Source', 'Target'], {
      NullSource: null,
      NumberSource: 123,
      ArraySource: [],
      Source: {
        main: 'not-an-array',
        ai_tool: null,
        custom: [
          null,
          [
            null,
            false,
            { node: 123, type: 'main', index: 0 },
            connection('Target', 'custom'),
          ],
        ],
      },
    })

    expect(r03DanglingNodeReferencesRule.run(workflow)).toEqual([])
  })

  it('ignores malformed entries but checks valid siblings', () => {
    const workflow = createWorkflow(['Source'], {
      Source: {
        main: [
          [
            { node: 'Missing', type: 'main' },
            { node: 'Missing', type: 'main', index: '0' },
            { node: 'Missing', type: 'main', index: -1 },
            { node: 'Missing', type: 'main', index: 1.5 },
            { node: 'Missing', type: '', index: 0 },
            { node: 123, type: 'main', index: 0 },
            connection('Missing'),
          ],
        ],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('reserves blank source and destination references for R04', () => {
    const workflow = createWorkflow(['Source'], {
      '': {
        main: [[connection('Missing')]],
      },
      '   ': {
        main: [[connection('Missing')]],
      },
      Source: {
        main: [[connection(''), connection('   ')]],
      },
    })

    expect(r03DanglingNodeReferencesRule.run(workflow)).toEqual([])
  })

  it('does not assign an ambiguous source node index', () => {
    const workflow = createWorkflow(['Shared', 'Shared'], {
      Shared: {
        main: [[connection('Missing')]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0]).not.toHaveProperty('nodeIndex')
  })

  it('does not reveal source or destination names', () => {
    const secret = 'SENTINEL_PRIVATE_NODE_123'

    const workflow = createWorkflow(['Source'], {
      [secret]: {
        main: [[connection('Source')]],
      },
      Source: {
        main: [[connection(secret)]],
      },
    })

    const findings = r03DanglingNodeReferencesRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['Source'], {
      Source: {
        main: [[connection('Missing')]],
      },
    })

    const originalContent = JSON.stringify(workflow)

    r03DanglingNodeReferencesRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[{"node":"constructor",' +
        '"type":"main","index":0}]]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(['__proto__', 'constructor'], connections)

    expect(r03DanglingNodeReferencesRule.run(workflow)).toEqual([])
  })

  it('works with the parser, normalizer, and executor', () => {
    const rawWorkflow = {
      nodes: [
        {
          id: 'source-id',
          name: 'Source',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {
        Source: {
          main: [[connection('Missing Target')]],
        },
      },
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    const result = runRules(normalized, [r03DanglingNodeReferencesRule])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe('R03')
      expect(result.findings[0].severity).toBe('error')
      expect(result.findings[0].confidence).toBe('high')
      expect(result.findings[0].nodeIndex).toBe(0)
    }
  })
})
