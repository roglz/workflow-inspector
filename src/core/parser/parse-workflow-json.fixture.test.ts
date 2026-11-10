import fixtureContent from './fixtures/n8n-demo.workflow.json?raw'
import { describe, expect, it } from 'vitest'
import { parseWorkflowJson } from './parse-workflow-json'

describe('parseWorkflowJson - official n8n fixture', () => {
  it('accepts the adapted official demo workflow', () => {
    const result = parseWorkflowJson(fixtureContent)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.workflow.name).toBe('Demo workflow')
    expect(result.workflow.nodes).toHaveLength(3)
    expect(result.workflow.nodes[1].typeVersion).toBe(1.7)
  })

  it('preserves main and AI connection types', () => {
    const result = parseWorkflowJson(fixtureContent)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.workflow.connections['Chat Trigger']).toEqual({
      main: [
        [
          {
            node: 'Basic LLM Chain',
            type: 'main',
            index: 0,
          },
        ],
      ],
    })

    expect(result.workflow.connections['Ollama Chat Model']).toEqual({
      ai_languageModel: [
        [
          {
            node: 'Basic LLM Chain',
            type: 'ai_languageModel',
            index: 0,
          },
        ],
      ],
    })
  })

  it('preserves node parameters and workflow settings', () => {
    const result = parseWorkflowJson(fixtureContent)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.workflow.nodes[2].parameters).toEqual({
      model: 'llama3.2:latest',
      options: {},
    })

    expect(result.workflow.settings).toEqual({
      executionOrder: 'v1',
    })
  })

  it('contains no credential references or webhook identifiers', () => {
    expect(fixtureContent).not.toMatch(/"credentials"\s*:/)
    expect(fixtureContent).not.toMatch(/"webhookId"\s*:/)
    expect(fixtureContent).not.toMatch(/"instanceId"\s*:/)
  })
})
