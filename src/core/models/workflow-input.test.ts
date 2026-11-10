import { describe, expect, it } from 'vitest'
import { workflowInputSchema } from './workflow-input'

const exampleWorkflow = {
  name: 'Demo workflow',
  nodes: [
    {
      id: 'node-1',
      name: 'Chat Trigger',
      type: '@n8n/n8n-nodes-langchain.chatTrigger',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
      disabled: false,
    },
    {
      id: 'node-2',
      name: 'Basic LLM Chain',
      type: '@n8n/n8n-nodes-langchain.chainLlm',
      typeVersion: 1.7,
      position: [160, 0],
      parameters: {},
    },
  ],
  connections: {
    'Chat Trigger': {
      main: [
        [
          {
            node: 'Basic LLM Chain',
            type: 'main',
            index: 0,
          },
        ],
        null,
      ],
    },
  },
  meta: {
    templateCredsSetupCompleted: true,
  },
}

describe('Workflow input schema', () => {
  it('accepts a valid workflow structure', () => {
    const result = workflowInputSchema.safeParse(exampleWorkflow)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data.nodes).toHaveLength(2)
    expect(result.data.nodes[1].typeVersion).toBe(1.7)
  })

  it('preserves additional fields', () => {
    const workflow = workflowInputSchema.parse(exampleWorkflow)

    expect(workflow.meta).toEqual({
      templateCredsSetupCompleted: true,
    })

    expect(workflow.nodes[0].disabled).toBe(false)
  })

  it('accepts nodes without an id', () => {
    const result = workflowInputSchema.safeParse({
      nodes: [
        {
          name: 'Legacy Node',
          type: 'custom.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {},
    })

    expect(result.success).toBe(true)
  })

  it('rejects workflows without a nodes array', () => {
    const result = workflowInputSchema.safeParse({
      connections: {},
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid root connections', () => {
    const result = workflowInputSchema.safeParse({
      nodes: [],
      connections: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects nodes missing essential fields', () => {
    const result = workflowInputSchema.safeParse({
      nodes: [
        {
          name: 'Incomplete Node',
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {},
    })

    expect(result.success).toBe(false)
  })

  it('preserves malformed nested connections for later analysis', () => {
    const malformedConnections = {
      'Chat Trigger': {
        main: 'invalid connection structure',
      },
    }

    const workflow = workflowInputSchema.parse({
      nodes: [],
      connections: malformedConnections,
    })

    expect(workflow.connections).toEqual(malformedConnections)
  })
})
