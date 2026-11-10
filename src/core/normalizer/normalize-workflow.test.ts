import { describe, expect, it } from 'vitest'

import type { WorkflowInput, WorkflowNodeInput } from '../models/workflow-input'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { normalizeWorkflow } from './normalize-workflow'

function createNode(name: string, id?: string): WorkflowNodeInput {
  return {
    ...(id === undefined ? {} : { id }),
    name,
    type: 'example.node',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }
}

function createWorkflow(
  nodes: WorkflowNodeInput[],
  connections: Record<string, unknown> = {},
): WorkflowInput {
  return {
    nodes,
    connections,
  }
}

describe('normalizeWorkflow', () => {
  it('preserves node order and original indices', () => {
    const workflow = createWorkflow([
      createNode('First', 'id-1'),
      createNode('Second', 'id-2'),
    ])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.nodes).toEqual([
      {
        nodeIndex: 0,
        id: 'id-1',
        name: 'First',
        type: 'example.node',
      },
      {
        nodeIndex: 1,
        id: 'id-2',
        name: 'Second',
        type: 'example.node',
      },
    ])
  })

  it('preserves duplicated node identifiers', () => {
    const workflow = createWorkflow([
      createNode('First', 'shared-id'),
      createNode('Second', 'shared-id'),
    ])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.nodes.map((node) => node.id)).toEqual([
      'shared-id',
      'shared-id',
    ])
  })

  it('preserves duplicated node names', () => {
    const workflow = createWorkflow([
      createNode('Shared Name', 'id-1'),
      createNode('Shared Name', 'id-2'),
    ])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.nodes.map((node) => node.name)).toEqual([
      'Shared Name',
      'Shared Name',
    ])
  })

  it('distinguishes missing and empty identifiers', () => {
    const workflow = createWorkflow([
      createNode('Missing ID'),
      createNode('Empty ID', ''),
    ])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.nodes[0].id).toBeUndefined()
    expect(normalized.nodes[1].id).toBe('')
  })

  it('preserves original spelling and whitespace', () => {
    const workflow = createWorkflow([
      createNode('  First NODE  ', '  ID-1  '),
      createNode('first node', 'id-1'),
    ])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.nodes[0].name).toBe('  First NODE  ')
    expect(normalized.nodes[0].id).toBe('  ID-1  ')
    expect(normalized.nodes[1].name).toBe('first node')
    expect(normalized.nodes[1].id).toBe('id-1')
  })

  it('handles workflows without nodes', () => {
    const normalized = normalizeWorkflow(createWorkflow([]))

    expect(normalized).toEqual({
      nodes: [],
      connections: {},
    })
  })

  it('does not modify the original workflow', () => {
    const workflow = createWorkflow(
      [createNode('Source', 'id-1'), createNode('Target', 'id-2')],
      {
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
    )

    const originalContent = JSON.stringify(workflow)

    const normalized = normalizeWorkflow(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
    expect(normalized.nodes).not.toBe(workflow.nodes)
    expect(normalized.connections).not.toBe(workflow.connections)
  })

  it('preserves an explicitly empty connections object', () => {
    const workflow = createWorkflow([createNode('Standalone', 'id-1')])

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.connections).toEqual({})
    expect(normalized).toHaveProperty('connections')
  })

  it('preserves main connections and source node names', () => {
    const connections = {
      'Start Node': {
        main: [
          [
            {
              node: 'Target Node',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    }

    const normalized = normalizeWorkflow(
      createWorkflow(
        [createNode('Start Node', 'id-1'), createNode('Target Node', 'id-2')],
        connections,
      ),
    )

    expect(normalized.connections).toEqual(connections)
  })

  it('preserves AI and other connection types', () => {
    const connections = {
      'Language Model': {
        ai_languageModel: [
          [
            {
              node: 'Agent',
              type: 'ai_languageModel',
              index: 0,
            },
          ],
        ],
      },
      Tool: {
        ai_tool: [
          [
            {
              node: 'Agent',
              type: 'ai_tool',
              index: 0,
            },
          ],
        ],
      },
      Memory: {
        ai_memory: [
          [
            {
              node: 'Agent',
              type: 'ai_memory',
              index: 0,
            },
          ],
        ],
      },
    }

    const normalized = normalizeWorkflow(
      createWorkflow([createNode('Agent', 'agent-id')], connections),
    )

    expect(normalized.connections).toEqual(connections)
  })

  it('preserves null buckets and multiple output branches', () => {
    const connections = {
      Switch: {
        main: [
          [],
          null,
          [
            {
              node: 'Branch Target',
              type: 'main',
              index: 0,
            },
          ],
          null,
        ],
      },
    }

    const normalized = normalizeWorkflow(
      createWorkflow([createNode('Switch', 'switch-id')], connections),
    )

    expect(normalized.connections).toEqual(connections)
  })

  it('preserves malformed connection entries', () => {
    const connections = {
      Source: {
        main: [
          [
            {
              node: 'Target',
              type: 'main',
              index: 'not-a-number',
            },
            {
              node: 123,
              type: null,
            },
            'invalid-entry',
            null,
          ],
        ],
      },
    }

    const normalized = normalizeWorkflow(
      createWorkflow([createNode('Source', 'source-id')], connections),
    )

    expect(normalized.connections).toEqual(connections)
  })

  it('preserves malformed source and connection type values', () => {
    const connections = {
      'Missing Source': null,
      'Other Source': 42,
      'Another Source': 'invalid-connection-map',
      Mixed: {
        main: 'not-an-array',
        ai_languageModel: 123,
        custom_type: [null],
      },
    }

    const normalized = normalizeWorkflow(
      createWorkflow([createNode('Mixed', 'mixed-id')], connections),
    )

    expect(normalized.connections).toEqual(connections)
  })

  it('creates an independent deep copy of connections', () => {
    const connections = {
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
    }

    const workflow = createWorkflow(
      [createNode('Source', 'source-id')],
      connections,
    )

    const normalized = normalizeWorkflow(workflow)

    expect(normalized.connections).toEqual(connections)
    expect(normalized.connections).not.toBe(connections)
    expect(normalized.connections?.Source).not.toBe(connections.Source)

    connections.Source.main[0][0].node = 'Changed Later'

    expect(normalized.connections).toEqual({
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
    })
  })

  it('preserves malformed nested data after JSON parsing', () => {
    const connections = {
      Source: {
        main: [
          null,
          [
            {
              node: 'Target',
              type: 'main',
              index: 0,
            },
            {
              node: 77,
              type: 'main',
              index: 'invalid',
            },
          ],
        ],
        ai_languageModel: 'invalid-type-value',
      },
      'Unknown Source': null,
    }

    const rawWorkflow = {
      nodes: [createNode('Source', 'source-id')],
      connections,
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    expect(normalized.connections).toEqual(connections)
  })
})
