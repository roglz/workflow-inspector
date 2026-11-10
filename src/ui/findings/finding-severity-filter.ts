import type { Finding } from '../../core/models/finding'

export type FindingSeverityFilter = 'all' | Finding['severity']

export interface IndexedFinding {
  readonly finding: Finding
  readonly originalIndex: number
}

export function parseFindingSeverityFilter(
  value: string,
): FindingSeverityFilter {
  switch (value) {
    case 'error':
    case 'warning':
    case 'info':
      return value

    default:
      return 'all'
  }
}

export function selectFindingsBySeverity(
  findings: readonly Finding[],
  severity: FindingSeverityFilter,
): IndexedFinding[] {
  const selected: IndexedFinding[] = []

  for (const [originalIndex, finding] of findings.entries()) {
    if (severity !== 'all' && finding.severity !== severity) {
      continue
    }

    selected.push({
      finding,
      originalIndex,
    })
  }

  return selected
}
