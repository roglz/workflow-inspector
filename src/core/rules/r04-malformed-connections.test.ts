import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { r04MalformedConnectionsRule } from './r04-malformed-connections'
import { runRules } from './run-rules'

function createWorkflow(
  connections: Record<string, unknown> = {},
  names: string[] = ['Source', 'Target'],
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

function connection(node = 'Target', type = 'main', index = 0) {
  return { node, type, index }
}

describe('R04 - Malformed connections', () => {
  it('has the expected rule metadata', () => {
    expect(r04MalformedConnectionsRule.id).toBe('R04')
    expect(r04MalformedConnectionsRule.description).toContain('connection')
  })

  it('accepts missing and empty connection maps', () => {
    const withoutConnections = createWorkflow()
    delete withoutConnections.connections

    expect(r04MalformedConnectionsRule.run(withoutConnections)).toEqual([])

    expect(r04MalformedConnectionsRule.run(createWorkflow())).toEqual([])
  })

  it('accepts valid main connections, null branches, and empty arrays', () => {
    const workflow = createWorkflow({
      Source: {
        main: [[connection()], null, [], [connection('Source')]],
      },
    })

    expect(r04MalformedConnectionsRule.run(workflow)).toEqual([])
  })

  it('accepts AI, custom groups, and different destination types', () => {
    const workflow = createWorkflow({
      Source: {
        ai_languageModel: [[connection('Target', 'ai_languageModel')]],
        ai_tool: [[connection('Target', 'ai_tool')]],
        custom_output: [[connection('Target', 'main')]],
      },
    })

    expect(r04MalformedConnectionsRule.run(workflow)).toEqual([])
  })

  it('accepts empty source maps and extra connection fields', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            {
              ...connection(),
              futureMetadata: { enabled: true },
            },
          ],
        ],
      },
      Target: {},
    })

    expect(r04MalformedConnectionsRule.run(workflow)).toEqual([])
  })

  it('detects source blocks with incorrect types', () => {
    const workflow = createWorkflow({
      Source: null,
      Target: 42,
      Ghost: [],
      Another: 'invalid',
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(4)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([
      0,
      1,
      undefined,
      undefined,
    ])
  })

  it('detects blank source names', () => {
    const workflow = createWorkflow({
      '': {},
      '   ': {},
      Source: {},
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(
      findings.every((finding) =>
        finding.description.includes('blank source name'),
      ),
    ).toBe(true)
  })

  it('detects connection groups with incorrect types', () => {
    const workflow = createWorkflow({
      Source: {
        main: null,
        ai_tool: 'invalid',
        ai_memory: {},
        custom: 42,
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(4)
    expect(
      findings.every((finding) =>
        finding.description.includes('array of branches'),
      ),
    ).toBe(true)
  })

  it('detects blank connection type names', () => {
    const workflow = createWorkflow({
      Source: {
        '': [],
        '   ': [],
        main: [],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(
      findings.every((finding) =>
        finding.description.includes('blank connection type name'),
      ),
    ).toBe(true)
  })

  it('detects malformed branches without rejecting null branches', () => {
    const workflow = createWorkflow({
      Source: {
        main: [5, {}, false, 'invalid', null, []],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(4)
    expect(
      findings.every((finding) =>
        finding.description.includes('array or null'),
      ),
    ).toBe(true)
  })

  it('detects null, primitive, and array connection entries', () => {
    const workflow = createWorkflow({
      Source: {
        main: [[null, 123, 'invalid', [], true, connection()]],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(5)
    expect(
      findings.every((finding) =>
        finding.description.includes('connection object'),
      ),
    ).toBe(true)
  })

  it('detects missing required connection fields', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            { type: 'main', index: 0 },
            { node: 'Target', index: 0 },
            { node: 'Target', type: 'main' },
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings[0].description).toContain('fields: node.')
    expect(findings[1].description).toContain('fields: type.')
    expect(findings[2].description).toContain('fields: index.')
  })

  it('detects fields with incorrect types', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            { node: 123, type: 'main', index: 0 },
            { node: 'Target', type: [], index: 0 },
            { node: 'Target', type: 'main', index: '0' },
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings[0].description).toContain('fields: node.')
    expect(findings[1].description).toContain('fields: type.')
    expect(findings[2].description).toContain('fields: index.')
  })

  it('detects blank node and type fields', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            connection(''),
            connection('   '),
            connection('Target', ''),
            connection('Target', '   '),
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(4)
    expect(findings[0].description).toContain('fields: node.')
    expect(findings[1].description).toContain('fields: node.')
    expect(findings[2].description).toContain('fields: type.')
    expect(findings[3].description).toContain('fields: type.')
  })

  it('rejects negative, fractional, and unsafe indices', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            connection('Target', 'main', -1),
            connection('Target', 'main', 1.5),
            connection('Target', 'main', Number.MAX_SAFE_INTEGER + 1),
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(
      findings.every((finding) =>
        finding.description.includes('fields: index.'),
      ),
    ).toBe(true)
  })

  it('rejects non-finite indices in direct normalized inputs', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            connection('Target', 'main', Number.NaN),
            connection('Target', 'main', Infinity),
            connection('Target', 'main', -Infinity),
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
  })

  it('generates one finding per entry with multiple invalid fields', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          [
            {
              node: 123,
              type: null,
              index: 'invalid',
            },
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].description).toContain(
      'invalid or missing fields: node, type, index.',
    )
  })

  it('continues through valid siblings in deterministic order', () => {
    const workflow = createWorkflow({
      Source: {
        main: [
          null,
          [
            null,
            connection(),
            { node: 'Target', type: 'main', index: 'invalid' },
          ],
          [connection('Target', 'main', -1)],
        ],
        ai_tool: 'invalid',
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(4)
    expect(findings.map((finding) => finding.description)).toEqual([
      'Connection source entry 1, group 1, branch 2, item 1 must be a connection object.',
      'Connection source entry 1, group 1, branch 2, item 3 has invalid or missing fields: index.',
      'Connection source entry 1, group 1, branch 3, item 1 has invalid or missing fields: index.',
      'Connection source entry 1, group 2 must be an array of branches.',
    ])
  })

  it('assigns nodeIndex only for an unambiguous source node', () => {
    const workflow = createWorkflow(
      {
        Source: { main: 'invalid' },
        Ghost: { main: 'invalid' },
        Shared: { main: 'invalid' },
      },
      ['Source', 'Shared', 'Shared'],
    )

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([
      0,
      undefined,
      undefined,
    ])
  })

  it('does not treat missing destination nodes as malformed', () => {
    const workflow = createWorkflow({
      Source: {
        main: [[connection('Does Not Exist')]],
      },
    })

    expect(r04MalformedConnectionsRule.run(workflow)).toEqual([])
  })

  it('does not expose original node names or connection values', () => {
    const secret = 'SENTINEL_PRIVATE_123'

    const workflow = createWorkflow({
      [secret]: null,
      Source: {
        [secret]: [
          [
            {
              node: 123,
              type: secret,
              index: 'invalid',
              extra: secret,
            },
          ],
        ],
      },
    })

    const findings = r04MalformedConnectionsRule.run(workflow)

    expect(findings).toHaveLength(2)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow({
      Source: {
        main: [[{ node: 42, type: 'main', index: 0 }], null],
      },
    })

    const originalContent = JSON.stringify(workflow)

    r04MalformedConnectionsRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('handles special JavaScript property names safely', () => {
    const connections = JSON.parse(
      '{"__proto__":{"main":[[{"node":"constructor",' +
        '"type":"main","index":0}]]}}',
    ) as Record<string, unknown>

    const workflow = createWorkflow(connections, ['__proto__', 'constructor'])

    expect(r04MalformedConnectionsRule.run(workflow)).toEqual([])
  })

  it('works with the parser, normalizer, R03, and executor', () => {
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
        {
          id: 'target-id',
          name: 'Target',
          type: 'example.node',
          typeVersion: 1,
          position: [100, 0],
          parameters: {},
        },
      ],
      connections: {
        Source: {
          main: [
            [
              connection('Missing Destination'),
              connection('Target', 'main', -1),
            ],
            null,
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
      r03DanglingNodeReferencesRule,
      r04MalformedConnectionsRule,
    ])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(2)

      expect(result.findings.map((finding) => finding.ruleId)).toEqual([
        'R03',
        'R04',
      ])

      expect(result.findings.map((finding) => finding.nodeIndex)).toEqual([
        0, 0,
      ])

      expect(
        result.findings.every(
          (finding) =>
            finding.severity === 'error' && finding.confidence === 'high',
        ),
      ).toBe(true)
    }
  })
})
