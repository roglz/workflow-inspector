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

interface ConnectedGroup {
  anchorIndex: number
  size: number
}

export const r06DisconnectedGroupsRule: AuditRule = {
  id: 'R06',

  description: 'Detect multiple disconnected groups of two or more nodes.',

  run(workflow) {
    if (workflow.nodes.length < 4 || !isRecord(workflow.connections)) {
      return []
    }

    const adjacency = new Map<string, Set<string>>()

    for (const node of workflow.nodes) {
      if (!isNonBlankString(node.name) || adjacency.has(node.name)) {
        return []
      }

      adjacency.set(node.name, new Set<string>())
    }

    // Validate the entire graph before generating findings.
    for (const [sourceName, sourceValue] of Object.entries(
      workflow.connections,
    )) {
      const sourceNeighbors = adjacency.get(sourceName)

      if (!sourceNeighbors || !isRecord(sourceValue)) {
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
            if (!isRecognizableConnection(entry)) {
              return []
            }

            const targetNeighbors = adjacency.get(entry.node)

            if (!targetNeighbors) {
              return []
            }

            // Treat the edge as undirected for group detection.
            sourceNeighbors.add(entry.node)
            targetNeighbors.add(sourceName)
          }
        }
      }
    }

    const visited = new Set<string>()
    const groups: ConnectedGroup[] = []

    // Scan nodes in their original order.
    for (const node of workflow.nodes) {
      if (visited.has(node.name)) {
        continue
      }

      const pending: string[] = [node.name]
      visited.add(node.name)

      let componentSize = 0

      while (pending.length > 0) {
        const currentName = pending.pop()

        if (currentName === undefined) {
          continue
        }

        componentSize += 1

        const neighbors = adjacency.get(currentName)

        if (!neighbors) {
          continue
        }

        for (const neighborName of neighbors) {
          if (visited.has(neighborName)) {
            continue
          }

          visited.add(neighborName)
          pending.push(neighborName)
        }
      }

      // Single nodes belong to the scope of R05.
      if (componentSize >= 2) {
        groups.push({
          anchorIndex: node.nodeIndex,
          size: componentSize,
        })
      }
    }

    if (groups.length < 2) {
      return []
    }

    const findings: Finding[] = groups.map((group) => ({
      ruleId: 'R06',
      severity: 'info',
      confidence: 'medium',
      title: 'Disconnected node group',
      description:
        `A group of ${group.size} connected nodes is separate ` +
        'from at least one other multi-node group.',
      recommendation:
        'Review whether these separate branches are intentional or should be connected.',
      nodeIndex: group.anchorIndex,
    }))

    return findings
  },
}
