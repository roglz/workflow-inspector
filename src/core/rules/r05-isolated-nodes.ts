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

export const r05IsolatedNodesRule: AuditRule = {
  id: 'R05',

  description:
    'Detect isolated nodes with no incoming or outgoing connections.',

  run(workflow) {
    if (workflow.nodes.length < 2 || !isRecord(workflow.connections)) {
      return []
    }

    const nodeNames = new Set<string>()

    for (const node of workflow.nodes) {
      if (!isNonBlankString(node.name) || nodeNames.has(node.name)) {
        return []
      }

      nodeNames.add(node.name)
    }

    const connectedNames = new Set<string>()

    for (const [sourceName, sourceValue] of Object.entries(
      workflow.connections,
    )) {
      if (!nodeNames.has(sourceName) || !isRecord(sourceValue)) {
        return []
      }

      for (const [groupName, branches] of Object.entries(sourceValue)) {
        if (!isNonBlankString(groupName) || !Array.isArray(branches)) {
          return []
        }

        for (const branch of branches) {
          if (branch === null) {
            continue
          }

          if (!Array.isArray(branch)) {
            return []
          }

          for (const entry of branch) {
            if (
              !isRecognizableConnection(entry) ||
              !nodeNames.has(entry.node)
            ) {
              return []
            }

            connectedNames.add(sourceName)
            connectedNames.add(entry.node)
          }
        }
      }
    }

    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      if (connectedNames.has(node.name)) {
        continue
      }

      findings.push({
        ruleId: 'R05',
        severity: 'warning',
        confidence: 'medium',
        title: 'Isolated node',
        description:
          `Node at position ${node.nodeIndex + 1} ` +
          'has no incoming or outgoing connections.',
        recommendation:
          'Review whether this node should be connected or is intentionally standalone.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
