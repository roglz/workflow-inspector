import type { WorkflowInput } from '../models/workflow-input'

export type WorkflowParseErrorCode = 'INVALID_JSON' | 'INVALID_STRUCTURE'

export interface WorkflowParseError {
  code: WorkflowParseErrorCode
  message: string
}

export type ParseWorkflowResult =
  | {
      success: true
      workflow: WorkflowInput
    }
  | {
      success: false
      error: WorkflowParseError
    }

export type ParseWorkflowJson = (content: string) => ParseWorkflowResult
