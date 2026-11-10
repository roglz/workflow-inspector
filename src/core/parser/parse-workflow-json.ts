import { workflowInputSchema } from '../models/workflow-input'
import type { ParseWorkflowJson } from './parser-contract'

export const parseWorkflowJson: ParseWorkflowJson = (content) => {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(content)
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'The input is not valid JSON.',
      },
    }
  }

  const validation = workflowInputSchema.safeParse(parsedValue)

  if (!validation.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_STRUCTURE',
        message: 'The JSON does not match the minimum workflow structure.',
      },
    }
  }

  return {
    success: true,
    workflow: validation.data,
  }
}
