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

interface DfsFrame {
  position: number
  nextNeighborIndex: number
}

export const r07MainConnectionCyclesRule: AuditRule = {
  id: 'R07',

  description: 'Detect directed cycles formed by main connections.',

  run(workflow) {
    if (!isRecord(workflow.connections)) {
      return []
    }

    const nodePositionByName = new Map<string, number>()

    for (const [position, node] of workflow.nodes.entries()) {
      if (!isNonBlankString(node.name) || nodePositionByName.has(node.name)) {
        return []
      }

      nodePositionByName.set(node.name, position)
    }

    const nodeCount = workflow.nodes.length

    const outgoing: number[][] = Array.from({ length: nodeCount }, () => [])

    const incoming: number[][] = Array.from({ length: nodeCount }, () => [])

    // Validate every connection group before analyzing main edges.
    for (const [sourceName, sourceValue] of Object.entries(
      workflow.connections,
    )) {
      const sourcePosition = nodePositionByName.get(sourceName)

      if (
        !isNonBlankString(sourceName) ||
        sourcePosition === undefined ||
        !isRecord(sourceValue)
      ) {
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

            const targetPosition = nodePositionByName.get(entry.node)

            if (targetPosition === undefined) {
              return []
            }

            // Only main outputs represent edges for R07.
            if (groupName === 'main') {
              outgoing[sourcePosition].push(targetPosition)
              incoming[targetPosition].push(sourcePosition)
            }
          }
        }
      }
    }

    // First pass: calculate DFS finishing order iteratively.
    const visited = new Set<number>()
    const finishOrder: number[] = []

    for (let start = 0; start < nodeCount; start += 1) {
      if (visited.has(start)) {
        continue
      }

      visited.add(start)

      const stack: DfsFrame[] = [{ position: start, nextNeighborIndex: 0 }]

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]
        const neighbors = outgoing[frame.position]

        if (frame.nextNeighborIndex < neighbors.length) {
          const next = neighbors[frame.nextNeighborIndex]
          frame.nextNeighborIndex += 1

          if (!visited.has(next)) {
            visited.add(next)

            stack.push({
              position: next,
              nextNeighborIndex: 0,
            })
          }
        } else {
          finishOrder.push(frame.position)
          stack.pop()
        }
      }
    }

    // Second pass: collect strongly connected components.
    const assigned = new Set<number>()
    const cycleSizeByAnchor = new Map<number, number>()

    for (let i = finishOrder.length - 1; i >= 0; i -= 1) {
      const start = finishOrder[i]

      if (assigned.has(start)) {
        continue
      }

      const pending = [start]
      const members: number[] = []

      assigned.add(start)

      while (pending.length > 0) {
        const current = pending.pop()

        if (current === undefined) {
          continue
        }

        members.push(current)

        for (const predecessor of incoming[current]) {
          if (assigned.has(predecessor)) {
            continue
          }

          assigned.add(predecessor)
          pending.push(predecessor)
        }
      }

      const hasMultipleNodes = members.length > 1
      const hasSelfLoop =
        members.length === 1 && outgoing[members[0]].includes(members[0])

      if (!hasMultipleNodes && !hasSelfLoop) {
        continue
      }

      let anchorPosition = members[0]

      for (const position of members) {
        if (position < anchorPosition) {
          anchorPosition = position
        }
      }

      cycleSizeByAnchor.set(anchorPosition, members.length)
    }

    const findings: Finding[] = []

    // Emit findings in original node order.
    for (const [position, node] of workflow.nodes.entries()) {
      const cycleSize = cycleSizeByAnchor.get(position)

      if (cycleSize === undefined) {
        continue
      }

      const label = cycleSize === 1 ? 'node' : 'nodes'

      findings.push({
        ruleId: 'R07',
        severity: 'info',
        confidence: 'medium',
        title: 'Directed cycle in main connections',
        description:
          `Main connections contain a directed cycle ` +
          `involving ${cycleSize} ${label}.`,
        recommendation:
          'Review whether the loop is intentional and has a reliable termination condition.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
