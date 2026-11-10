import { describe, expect, it } from 'vitest'

import { findingSchema, ruleIds } from '../models/finding'

import type { AuditRule } from './rule-contract'

const validFinding = {
  ruleId: 'R01',
  severity: 'error',
  confidence: 'high',
  title: 'Duplicate node identifier',
  description: 'Two nodes share the same identifier.',
  recommendation: 'Assign unique identifiers to the nodes.',
  nodeIndex: 1,
}

describe('Finding schema', () => {
  it('accepts a valid node-level finding', () => {
    const result = findingSchema.safeParse(validFinding)

    expect(result.success).toBe(true)
  })

  it('accepts findings without a node index', () => {
    const { nodeIndex: _unused, ...workflowFinding } = validFinding

    const result = findingSchema.safeParse(workflowFinding)

    expect(result.success).toBe(true)
  })

  it('rejects unregistered rule identifiers', () => {
    const result = findingSchema.safeParse({
      ...validFinding,
      ruleId: 'R99',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid severity values', () => {
    const result = findingSchema.safeParse({
      ...validFinding,
      severity: 'urgent',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid confidence values', () => {
    const result = findingSchema.safeParse({
      ...validFinding,
      confidence: 'certain',
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative and fractional node indices', () => {
    const negativeIndex = findingSchema.safeParse({
      ...validFinding,
      nodeIndex: -1,
    })

    const fractionalIndex = findingSchema.safeParse({
      ...validFinding,
      nodeIndex: 1.5,
    })

    expect(negativeIndex.success).toBe(false)
    expect(fractionalIndex.success).toBe(false)
  })

  it('rejects empty descriptions and recommendations', () => {
    const emptyDescription = findingSchema.safeParse({
      ...validFinding,
      description: '',
    })

    const emptyRecommendation = findingSchema.safeParse({
      ...validFinding,
      recommendation: '',
    })

    expect(emptyDescription.success).toBe(false)
    expect(emptyRecommendation.success).toBe(false)
  })

  it('rejects unexpected result fields', () => {
    const result = findingSchema.safeParse({
      ...validFinding,
      rawCredentials: 'TEST_ONLY_VALUE',
    })

    expect(result.success).toBe(false)
  })

  it('defines the planned rule identifiers', () => {
    expect(ruleIds).toHaveLength(10)
    expect(ruleIds[0]).toBe('R01')
    expect(ruleIds[9]).toBe('R10')
    expect(new Set(ruleIds).size).toBe(10)
  })
})

describe('AuditRule contract', () => {
  it('supports a rule that returns no findings', () => {
    const contractTestRule: AuditRule = {
      id: 'R01',
      description: 'Contract verification only',

      run: () => [],
    }

    const result = contractTestRule.run({
      nodes: [],
    })

    expect(contractTestRule.id).toBe('R01')
    expect(result).toEqual([])
  })
})
