import type { Finding } from '../models/finding'
import type { AuditRule } from './rule-contract'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function getInvalidFields(connection: Record<string, unknown>): string[] {
  const invalidFields: string[] = []

  if (!isNonBlankString(connection.node)) {
    invalidFields.push('node')
  }

  if (!isNonBlankString(connection.type)) {
    invalidFields.push('type')
  }

  if (!isValidIndex(connection.index)) {
    invalidFields.push('index')
  }

  return invalidFields
}

function addFinding(
  findings: Finding[],
  description: string,
  nodeIndex?: number,
): void {
  findings.push({
    ruleId: 'R04',
    severity: 'error',
    confidence: 'high',
    title: 'Malformed connection structure',
    description,
    recommendation:
      'Repair the connection structure to match the expected n8n format.',
    ...(nodeIndex === undefined ? {} : { nodeIndex }),
  })
}

export const r04MalformedConnectionsRule: AuditRule = {
  id: 'R04',

  description: 'Detect malformed connection groups, branches, and entries.',

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

    const sources = Object.entries(workflow.connections ?? {})

    for (const [
      sourcePosition,
      [sourceName, sourceValue],
    ] of sources.entries()) {
      const sourceLocation = `Connection source entry ${sourcePosition + 1}`

      const mappedIndex = nodeIndexByName.get(sourceName)
      const nodeIndex =
        typeof mappedIndex === 'number' ? mappedIndex : undefined

      if (!isNonBlankString(sourceName)) {
        addFinding(findings, `${sourceLocation} has a blank source name.`)
        continue
      }

      if (!isRecord(sourceValue)) {
        addFinding(
          findings,
          `${sourceLocation} must contain an object of connection groups.`,
          nodeIndex,
        )
        continue
      }

      const groups = Object.entries(sourceValue)

      for (const [groupPosition, [groupName, groupValue]] of groups.entries()) {
        const groupLocation = `${sourceLocation}, group ${groupPosition + 1}`

        if (!isNonBlankString(groupName)) {
          addFinding(
            findings,
            `${groupLocation} has a blank connection type name.`,
            nodeIndex,
          )
          continue
        }

        if (!Array.isArray(groupValue)) {
          addFinding(
            findings,
            `${groupLocation} must be an array of branches.`,
            nodeIndex,
          )
          continue
        }

        for (const [branchPosition, branch] of groupValue.entries()) {
          const branchLocation = `${groupLocation}, branch ${branchPosition + 1}`

          if (branch === null) {
            continue
          }

          if (!Array.isArray(branch)) {
            addFinding(
              findings,
              `${branchLocation} must be an array or null.`,
              nodeIndex,
            )
            continue
          }

          for (const [itemPosition, entry] of branch.entries()) {
            const itemLocation = `${branchLocation}, item ${itemPosition + 1}`

            if (!isRecord(entry)) {
              addFinding(
                findings,
                `${itemLocation} must be a connection object.`,
                nodeIndex,
              )
              continue
            }

            const invalidFields = getInvalidFields(entry)

            if (invalidFields.length > 0) {
              addFinding(
                findings,
                `${itemLocation} has invalid or missing fields: ` +
                  `${invalidFields.join(', ')}.`,
                nodeIndex,
              )
            }
          }
        }
      }
    }

    return findings
  },
}
