import { z } from 'zod'

import { findingSchema } from '../models/finding'
import type { Finding, RuleId } from '../models/finding'
import type { NormalizedWorkflow } from '../models/normalized-workflow'
import type { AuditRule } from './rule-contract'

const ruleFindingsSchema = z.array(findingSchema)

export type RuleRunErrorCode = 'RULE_EXECUTION_FAILED' | 'INVALID_RULE_RESULT'

export interface RuleRunError {
  code: RuleRunErrorCode
  ruleId: RuleId
  message: string
}

export type RunRulesResult =
  | {
      success: true
      findings: Finding[]
    }
  | {
      success: false
      error: RuleRunError
    }

export function runRules(
  workflow: NormalizedWorkflow,
  rules: readonly AuditRule[],
): RunRulesResult {
  const findings: Finding[] = []

  for (const rule of rules) {
    let output: unknown

    try {
      output = rule.run(workflow)
    } catch {
      return {
        success: false,
        error: {
          code: 'RULE_EXECUTION_FAILED',
          ruleId: rule.id,
          message: 'A rule could not be executed.',
        },
      }
    }

    const validation = ruleFindingsSchema.safeParse(output)

    if (
      !validation.success ||
      validation.data.some(
        (finding) =>
          finding.ruleId !== rule.id ||
          (finding.nodeIndex !== undefined &&
            finding.nodeIndex >= workflow.nodes.length),
      )
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_RULE_RESULT',
          ruleId: rule.id,
          message: 'A rule returned invalid findings.',
        },
      }
    }

    findings.push(...validation.data)
  }

  return {
    success: true,
    findings,
  }
}
