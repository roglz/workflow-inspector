import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

export const r09MissingNodeIdsRule: AuditRule = {
  id: 'R09',

  description: 'Detect nodes with missing or blank identifiers.',

  run(workflow) {
    const findings: Finding[] = []

    for (const node of workflow.nodes) {
      const id = node.id
      const isMissing = id === undefined

      if (id !== undefined && id.trim().length > 0) {
        continue
      }

      findings.push({
        ruleId: 'R09',
        severity: 'warning',
        confidence: 'high',
        title: 'Missing or blank node identifier',
        description: isMissing
          ? `Node at position ${node.nodeIndex + 1} is missing an identifier.`
          : `Node at position ${node.nodeIndex + 1} has a blank identifier.`,
        recommendation:
          'Assign a non-blank identifier that is unique within the workflow.',
        nodeIndex: node.nodeIndex,
      })
    }

    return findings
  },
}
