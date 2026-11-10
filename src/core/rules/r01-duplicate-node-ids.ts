import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

export const r01DuplicateNodeIdsRule: AuditRule = {
  id: 'R01',

  description: 'Detect nodes sharing the same non-empty identifier.',

  run(workflow) {
    const firstNodeIndexById = new Map<string, number>()
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      const id = node.id

      if (id === undefined || id.trim().length === 0) {
        continue
      }

      const firstNodeIndex = firstNodeIndexById.get(id)

      if (firstNodeIndex === undefined) {
        firstNodeIndexById.set(id, node.nodeIndex)
        continue
      }

      findings.push({
        ruleId: 'R01',
        severity: 'error',
        confidence: 'high',
        title: 'Duplicate node identifier',
        description:
          `Node at position ${node.nodeIndex + 1} shares an identifier ` +
          `with node at position ${firstNodeIndex + 1}.`,
        recommendation:
          'Review the affected nodes and ensure each has a unique identifier.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
