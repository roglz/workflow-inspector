import { describe, expect, it } from 'vitest'
import { parseWorkflowJson } from './parse-workflow-json'

describe('parseWorkflowJson', () => {
  it('parses a minimal valid workflow', () => {
    const input = {
      nodes: [],
      connections: {},
    }

    const result = parseWorkflowJson(JSON.stringify(input))

    expect(result).toEqual({
      success: true,
      workflow: input,
    })
  })

  it('preserves nodes, expressions, and additional metadata', () => {
    const input = {
      name: 'Example workflow',
      nodes: [
        {
          id: 'node-1',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [120, 240],
          parameters: {
            url: 'https://example.com',
            expression: '={{ $json.value }}',
          },
        },
      ],
      connections: {},
      active: false,
    }

    const result = parseWorkflowJson(JSON.stringify(input))

    expect(result).toEqual({
      success: true,
      workflow: input,
    })
  })

  it('preserves malformed nested connections for later analysis', () => {
    const input = {
      nodes: [],
      connections: {
        'Example Node': {
          main: 'invalid connection structure',
        },
      },
    }

    const result = parseWorkflowJson(JSON.stringify(input))

    expect(result).toEqual({
      success: true,
      workflow: input,
    })
  })

  it('reports malformed JSON', () => {
    const result = parseWorkflowJson('{"nodes": [}')

    expect(result).toEqual({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'The input is not valid JSON.',
      },
    })
  })

  it('rejects empty input', () => {
    const result = parseWorkflowJson('')

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_JSON')
    }
  })

  it('rejects a non-object JSON root', () => {
    const result = parseWorkflowJson('null')

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('rejects workflows without nodes', () => {
    const result = parseWorkflowJson(
      JSON.stringify({
        connections: {},
      }),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('rejects structurally invalid nodes', () => {
    const result = parseWorkflowJson(
      JSON.stringify({
        nodes: [
          {
            name: 'Invalid Node',
            type: 'n8n-nodes-base.set',
            typeVersion: '1',
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      }),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('rejects invalid root connections', () => {
    const result = parseWorkflowJson(
      JSON.stringify({
        nodes: [],
        connections: [],
      }),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE')
    }
  })

  it('does not expose input secrets in error results', () => {
    const secret = 'SENTINEL_PRIVATE_123'

    const invalidJson = parseWorkflowJson(`{"secret":"${secret}","nodes":[}`)

    const invalidStructure = parseWorkflowJson(
      JSON.stringify({
        nodes: 'invalid',
        connections: {},
        secret,
      }),
    )

    expect(invalidJson.success).toBe(false)
    expect(invalidStructure.success).toBe(false)

    expect(JSON.stringify(invalidJson)).not.toContain(secret)
    expect(JSON.stringify(invalidStructure)).not.toContain(secret)
  })
})
