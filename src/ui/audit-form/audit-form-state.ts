import {
  auditWorkflowJson,
  type AuditWorkflowResult,
} from '../../core/audit/audit-workflow-json'

export type AuditFormFeedback =
  | { kind: 'idle' }
  | { kind: 'empty' }
  | {
      kind: 'audit'
      result: AuditWorkflowResult
    }

export interface AuditFormState {
  input: string
  feedback: AuditFormFeedback
}

export type AuditFormAction =
  | {
      type: 'edit'
      value: string
    }
  | {
      type: 'submit'
    }

export const initialAuditFormState: AuditFormState = {
  input: '',
  feedback: { kind: 'idle' },
}

export function auditFormReducer(
  state: AuditFormState,
  action: AuditFormAction,
): AuditFormState {
  switch (action.type) {
    case 'edit':
      return {
        input: action.value,
        feedback: { kind: 'idle' },
      }

    case 'submit':
      if (state.input.trim().length === 0) {
        return {
          ...state,
          feedback: { kind: 'empty' },
        }
      }

      return {
        ...state,
        feedback: {
          kind: 'audit',
          result: auditWorkflowJson(state.input),
        },
      }
  }
}

export function getSafeAuditErrorText(code: string): string {
  switch (code) {
    case 'INVALID_JSON':
      return 'The input is not valid JSON. Check its syntax.'

    case 'INVALID_STRUCTURE':
      return (
        'The JSON is valid, but it does not contain the ' +
        'minimum structure required for an n8n workflow.'
      )

    case 'RULE_EXECUTION_FAILED':
      return 'The audit could not be completed due to an internal error.'

    case 'INVALID_RULE_RESULT':
      return 'The audit engine returned an invalid result.'

    default:
      return 'The audit could not be completed.'
  }
}
