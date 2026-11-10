import { describe, expect, it } from 'vitest'

import type { Finding, RuleId } from '../models/finding'
import type { NormalizedWorkflow } from '../models/normalized-workflow'
import type { AuditRule } from './rule-contract'
import { runRules } from './run-rules'

const workflow: NormalizedWorkflow = {
  nodes: [
    {
      nodeIndex: 0,
      id: 'node-1',
      name: 'First Node',
      type: 'example.node',
    },
    {
      nodeIndex: 1,
      id: 'node-2',
      name: 'Second Node',
      type: 'example.node',
    },
  ],
}

const exampleFinding: Finding = {
  ruleId: 'R01',
  severity: 'warning',
  confidence: 'high',
  title: 'Synthetic finding',
  description: 'Generated exclusively for testing.',
  recommendation: 'No action is required.',
  nodeIndex: 0,
}

function createTestRule(id: RuleId, run: AuditRule['run']): AuditRule {
  return {
    id,
    description: 'Synthetic rule for testing only',
    run,
  }
}

describe('runRules', () => {
  it('returns no findings when no rules are provided', () => {
    const result = runRules(workflow, [])

    expect(result).toEqual({
      success: true,
      findings: [],
    })
  })

  it('preserves rule execution order and finding order', () => {
    const executionOrder: string[] = []

    const secondFinding: Finding = {
      ...exampleFinding,
      ruleId: 'R02',
      nodeIndex: 1,
    }

    const firstRule = createTestRule('R01', () => {
      executionOrder.push('R01')
      return [exampleFinding]
    })

    const secondRule = createTestRule('R02', () => {
      executionOrder.push('R02')
      return [secondFinding]
    })

    const result = runRules(workflow, [firstRule, secondRule])

    expect(executionOrder).toEqual(['R01', 'R02'])

    expect(result).toEqual({
      success: true,
      findings: [exampleFinding, secondFinding],
    })
  })

  it('continues when a rule returns no findings', () => {
    const firstRule = createTestRule('R01', () => [])

    const secondRule = createTestRule('R02', () => [
      {
        ...exampleFinding,
        ruleId: 'R02',
      },
    ])

    const result = runRules(workflow, [firstRule, secondRule])

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe('R02')
    }
  })

  it('rejects results that are not arrays', () => {
    const invalidRule = createTestRule(
      'R01',
      () => 'invalid result' as unknown as Finding[],
    )

    const result = runRules(workflow, [invalidRule])

    expect(result).toEqual({
      success: false,
      error: {
        code: 'INVALID_RULE_RESULT',
        ruleId: 'R01',
        message: 'A rule returned invalid findings.',
      },
    })
  })

  it('rejects malformed findings without exposing their contents', () => {
    const secret = 'SENTINEL_PRIVATE_123'

    const invalidRule = createTestRule(
      'R01',
      () =>
        [
          {
            ...exampleFinding,
            severity: 'invalid',
            rawCredential: secret,
          },
        ] as unknown as Finding[],
    )

    const result = runRules(workflow, [invalidRule])

    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toContain(secret)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_RULE_RESULT')
    }
  })

  it('rejects findings attributed to a different rule', () => {
    const invalidRule = createTestRule('R02', () => [exampleFinding])

    const result = runRules(workflow, [invalidRule])

    expect(result).toEqual({
      success: false,
      error: {
        code: 'INVALID_RULE_RESULT',
        ruleId: 'R02',
        message: 'A rule returned invalid findings.',
      },
    })
  })

  it('rejects node indices outside the workflow', () => {
    const invalidRule = createTestRule('R01', () => [
      {
        ...exampleFinding,
        nodeIndex: 2,
      },
    ])

    const result = runRules(workflow, [invalidRule])

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_RULE_RESULT')
    }
  })

  it('stops on exceptions without returning partial findings', () => {
    const secret = 'SENTINEL_EXCEPTION_456'
    let subsequentRuleExecuted = false

    const firstRule = createTestRule('R01', () => [exampleFinding])

    const failingRule = createTestRule('R02', () => {
      throw new Error(secret)
    })

    const subsequentRule = createTestRule('R03', () => {
      subsequentRuleExecuted = true
      return []
    })

    const result = runRules(workflow, [firstRule, failingRule, subsequentRule])

    expect(result).toEqual({
      success: false,
      error: {
        code: 'RULE_EXECUTION_FAILED',
        ruleId: 'R02',
        message: 'A rule could not be executed.',
      },
    })

    expect(subsequentRuleExecuted).toBe(false)
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(result).not.toHaveProperty('findings')
  })
})
