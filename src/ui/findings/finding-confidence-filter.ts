import type { Finding } from '../../core/models/finding'
import type { IndexedFinding } from './finding-severity-filter'

export type FindingConfidenceFilter = 'all' | Finding['confidence']

export function parseFindingConfidenceFilter(
  value: string,
): FindingConfidenceFilter {
  switch (value) {
    case 'high':
    case 'medium':
    case 'low':
      return value

    default:
      return 'all'
  }
}

export function selectFindingsByConfidence(
  findings: readonly IndexedFinding[],
  confidence: FindingConfidenceFilter,
): IndexedFinding[] {
  return findings.filter(
    ({ finding }) => confidence === 'all' || finding.confidence === confidence,
  )
}
