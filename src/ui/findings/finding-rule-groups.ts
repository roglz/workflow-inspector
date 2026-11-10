import type { Finding } from '../../core/models/finding'
import type { IndexedFinding } from './finding-severity-filter'

export type FindingViewMode = 'list' | 'grouped'

export interface FindingRuleGroup {
  readonly ruleId: Finding['ruleId']
  readonly items: readonly IndexedFinding[]
}

export function parseFindingViewMode(value: string): FindingViewMode {
  return value === 'grouped' ? 'grouped' : 'list'
}

export function groupFindingsByRule(
  findings: readonly IndexedFinding[],
): FindingRuleGroup[] {
  const groups = new Map<Finding['ruleId'], IndexedFinding[]>()

  for (const item of findings) {
    const ruleId = item.finding.ruleId
    const existing = groups.get(ruleId)

    if (existing) {
      existing.push(item)
    } else {
      groups.set(ruleId, [item])
    }
  }

  return Array.from(groups, ([ruleId, items]) => ({
    ruleId,
    items,
  }))
}
