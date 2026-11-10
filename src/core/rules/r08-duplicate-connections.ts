import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

interface RecognizableConnection {
  node: string
  type: string
  index: number
}

function isRecognizableConnection(
  value: unknown,
): value is RecognizableConnection {
  return (
    isRecord(value) &&
    isNonBlankString(value.node) &&
    isNonBlankString(value.type) &&
    typeof value.index === 'number' &&
    Number.isSafeInteger(value.index) &&
    value.index >= 0
  )
}

export const r08DuplicateConnectionsRule: AuditRule = {
  id: 'R08',

  description:
    'Detect repeated connection entries within the same output branch.',

  run(workflow) {
    if (!isRecord(workflow.connections)) {
      return []
    }

    const nodeIndexByName = new Map<string, number>()
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      if (!isNonBlankString(node.name) || nodeIndexByName.has(node.name)) {
        return []
      }

      nodeIndexByName.set(node.name, node.nodeIndex)
    }

    for (const [sourcePosition, [sourceName, sourceValue]] of Object.entries(
      workflow.connections,
    ).entries()) {
      const sourceNodeIndex = nodeIndexByName.get(sourceName)

      if (
        !isNonBlankString(sourceName) ||
        sourceNodeIndex === undefined ||
        !isRecord(sourceValue)
      ) {
        return []
      }

      for (const [groupPosition, [groupName, branches]] of Object.entries(
        sourceValue,
      ).entries()) {
        if (!isNonBlankString(groupName) || !Array.isArray(branches)) {
          return []
        }

        for (const [branchPosition, branch] of branches.entries()) {
          if (branch === null) {
            continue
          }

          if (!Array.isArray(branch)) {
            return []
          }

          const firstItemPositionByKey = new Map<string, number>()

          for (const [itemPosition, entry] of branch.entries()) {
            if (
              !isRecognizableConnection(entry) ||
              !nodeIndexByName.has(entry.node)
            ) {
              return []
            }

            const key = JSON.stringify([entry.node, entry.type, entry.index])

            const firstItemPosition = firstItemPositionByKey.get(key)

            if (firstItemPosition === undefined) {
              firstItemPositionByKey.set(key, itemPosition)
              continue
            }

            findings.push({
              ruleId: 'R08',
              severity: 'warning',
              confidence: 'medium',
              title: 'Duplicate connection entry',
              description:
                `Connection source entry ${sourcePosition + 1}, ` +
                `group ${groupPosition + 1}, ` +
                `branch ${branchPosition + 1}, ` +
                `item ${itemPosition + 1} repeats ` +
                `item ${firstItemPosition + 1} in the same branch.`,
              recommendation:
                'Review the repeated connection and remove redundant entries if unintentional.',
              nodeIndex: sourceNodeIndex,
            })
          }
        }
      }
    }

    return findings
  },
}
