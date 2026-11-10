import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

export const r10BlankNodeNamesRule: AuditRule = {
  id: 'R10',

  description: 'Detect nodes with empty or whitespace-only names.',

  run(workflow) {
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      if (node.name.trim().length > 0) {
        continue
      }

      findings.push({
        ruleId: 'R10',
        severity: 'warning',
        confidence: 'high',
        title: 'Blank node name',
        description:
          `Node at position ${node.nodeIndex + 1} ` +
          'has an empty or whitespace-only name.',
        recommendation:
          'Assign a non-blank, descriptive name and review references to the node.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
