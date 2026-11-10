import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    typeof value.node === 'string' &&
    value.node.trim().length > 0 &&
    typeof value.type === 'string' &&
    value.type.trim().length > 0 &&
    typeof value.index === 'number' &&
    Number.isInteger(value.index) &&
    value.index >= 0
  )
}

export const r03DanglingNodeReferencesRule: AuditRule = {
  id: 'R03',

  description:
    'Detect connections referencing source or destination nodes that do not exist.',

  run(workflow) {
    const nodeIndexByName = new Map<string, number | null>()
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      if (nodeIndexByName.has(node.name)) {
        nodeIndexByName.set(node.name, null)
      } else {
        nodeIndexByName.set(node.name, node.nodeIndex)
      }
    }

    const sourceEntries = Object.entries(workflow.connections ?? {})

    for (const [
      sourcePosition,
      [sourceName, sourceConnections],
    ] of sourceEntries.entries()) {
      if (sourceName.trim().length === 0 || !isRecord(sourceConnections)) {
        continue
      }

      if (!nodeIndexByName.has(sourceName)) {
        findings.push({
          ruleId: 'R03',
          severity: 'error',
          confidence: 'high',
          title: 'Connection source node does not exist',
          description:
            `Connection source entry ${sourcePosition + 1} ` +
            'references a node that does not exist.',
          recommendation:
            'Update the connection source to an existing node name or remove the invalid connection.',
        })

        continue
      }

      const sourceNodeIndex = nodeIndexByName.get(sourceName)
      const connectionGroups = Object.entries(sourceConnections)

      for (const [
        groupPosition,
        [groupName, buckets],
      ] of connectionGroups.entries()) {
        if (groupName.trim().length === 0 || !Array.isArray(buckets)) {
          continue
        }

        for (const [branchPosition, bucket] of buckets.entries()) {
          if (!Array.isArray(bucket)) {
            continue
          }

          for (const [itemPosition, connection] of bucket.entries()) {
            if (!isRecognizableConnection(connection)) {
              continue
            }

            if (nodeIndexByName.has(connection.node)) {
              continue
            }

            findings.push({
              ruleId: 'R03',
              severity: 'error',
              confidence: 'high',
              title: 'Connection destination node does not exist',
              description:
                `Connection from source entry ${sourcePosition + 1}, ` +
                `output group ${groupPosition + 1}, ` +
                `branch ${branchPosition + 1}, ` +
                `item ${itemPosition + 1} references a destination ` +
                'node that does not exist.',
              recommendation:
                'Update the destination reference to an existing node name or remove the connection.',
              ...(typeof sourceNodeIndex === 'number'
                ? { nodeIndex: sourceNodeIndex }
                : {}),
            })
          }
        }
      }
    }

    return findings
  },
}
