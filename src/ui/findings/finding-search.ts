import type { IndexedFinding } from './finding-severity-filter'

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function selectFindingsBySearch(
  findings: readonly IndexedFinding[],
  query: string,
): IndexedFinding[] {
  const normalizedQuery = normalizeSearchText(query)

  if (normalizedQuery.length === 0) {
    return [...findings]
  }

  return findings.filter(({ finding }) => {
    const searchableFields = [
      finding.ruleId,
      finding.title,
      finding.description,
      finding.recommendation,
    ]

    return searchableFields.some((value) =>
      normalizeSearchText(value).includes(normalizedQuery),
    )
  })
}
