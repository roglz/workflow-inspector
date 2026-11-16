import {
  auditWorkflowJson,
  type AuditWorkflowResult,
} from '../core/audit/audit-workflow-json'
import {
  trackAuditCompleted,
  trackAuditFailed,
  trackAuditStarted,
} from './audit-events'

export type TrackedAuditOutcome =
  | { kind: 'empty' }
  | { kind: 'result'; result: AuditWorkflowResult }
  | { kind: 'unexpected_failure' }

type AuditFunction = (input: string) => AuditWorkflowResult

export function runTrackedAudit(
  input: string,
  audit: AuditFunction = auditWorkflowJson,
): TrackedAuditOutcome {
  if (input.trim().length === 0) {
    return { kind: 'empty' }
  }

  trackAuditStarted()

  try {
    const result = audit(input)

    if (result.success) {
      trackAuditCompleted()
    } else {
      trackAuditFailed(result.error.code)
    }

    return {
      kind: 'result',
      result,
    }
  } catch {
    trackAuditFailed('UNEXPECTED_AUDIT_EXCEPTION')

    return { kind: 'unexpected_failure' }
  }
}
