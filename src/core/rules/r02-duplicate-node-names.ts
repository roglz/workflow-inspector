import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

export const r02DuplicateNodeNamesRule: AuditRule = {
  id: 'R02',

  description: 'Detect nodes sharing the same name.',

  run(workflow) {
    const firstNodeIndexByName = new Map<string, number>()
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      const firstNodeIndex = firstNodeIndexByName.get(node.name)

      if (firstNodeIndex === undefined) {
        firstNodeIndexByName.set(node.name, node.nodeIndex)
        continue
      }

      findings.push({
        ruleId: 'R02',
        severity: 'error',
        confidence: 'high',
        title: 'Duplicate node name',
        description:
          `Node at position ${node.nodeIndex + 1} shares a name ` +
          `with node at position ${firstNodeIndex + 1}.`,
        recommendation: 'Rename the affected nodes so each has a unique name.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
