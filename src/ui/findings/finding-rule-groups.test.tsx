import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import { FindingList } from './finding-list'
import { selectFindingsByConfidence } from './finding-confidence-filter'
import {
  groupFindingsByRule,
  parseFindingViewMode,
} from './finding-rule-groups'
import { selectFindingsBySearch } from './finding-search'
import { selectFindingsBySeverity } from './finding-severity-filter'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'R09',
    severity: 'warning',
    confidence: 'high',
    title: 'Missing identifier',
    description: 'A node has no identifier.',
    recommendation: 'Assign a unique identifier.',
    nodeIndex: 0,
    ...overrides,
  }
}

function mixedFindings(): Finding[] {
  return [
    makeFinding({
      ruleId: 'R09',
      title: 'Missing identifier',
      confidence: 'high',
    }),
    makeFinding({
      ruleId: 'R07',
      title: 'Directed cycle',
      severity: 'info',
      confidence: 'medium',
    }),
    makeFinding({
      ruleId: 'R09',
      title: 'Missing another ID',
      confidence: 'medium',
    }),
    makeFinding({
      ruleId: 'R01',
      title: 'Duplicate ID',
      severity: 'error',
      confidence: 'high',
    }),
    makeFinding({
      ruleId: 'R07',
      title: 'Second directed cycle',
      severity: 'info',
      confidence: 'medium',
    }),
  ]
}

function indexedFindings() {
  return selectFindingsBySeverity(mixedFindings(), 'all')
}

function renderFindings(findings: readonly Finding[]) {
  return renderToStaticMarkup(<FindingList findings={findings} />)
}

describe('Stage 4 - Finding groups by rule', () => {
  it('accepts the list view mode', () => {
    expect(parseFindingViewMode('list')).toBe('list')
  })

  it('accepts the grouped view mode', () => {
    expect(parseFindingViewMode('grouped')).toBe('grouped')
  })

  it('defaults unknown values to list', () => {
    expect(parseFindingViewMode('SENTINEL_UNKNOWN_VIEW')).toBe('list')
  })

  it('does not accept uppercase view modes', () => {
    expect(parseFindingViewMode('GROUPED')).toBe('list')
  })

  it('returns no groups for empty input', () => {
    expect(groupFindingsByRule([])).toEqual([])
  })

  it('creates one group for one finding', () => {
    const groups = groupFindingsByRule(
      selectFindingsBySeverity([makeFinding()], 'all'),
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].ruleId).toBe('R09')
    expect(groups[0].items).toHaveLength(1)
  })

  it('preserves the rule first-appearance order', () => {
    const groups = groupFindingsByRule(indexedFindings())

    expect(groups.map((group) => group.ruleId)).toEqual(['R09', 'R07', 'R01'])
  })

  it('counts each rule group correctly', () => {
    const groups = groupFindingsByRule(indexedFindings())

    expect(groups.map((group) => group.items.length)).toEqual([2, 2, 1])
  })

  it('preserves original indices in each group', () => {
    const groups = groupFindingsByRule(indexedFindings())

    expect(groups[0].items.map((item) => item.originalIndex)).toEqual([0, 2])

    expect(groups[1].items.map((item) => item.originalIndex)).toEqual([1, 4])
  })

  it('preserves relative order inside a group', () => {
    const groups = groupFindingsByRule(indexedFindings())

    expect(groups[1].items.map((item) => item.finding.title)).toEqual([
      'Directed cycle',
      'Second directed cycle',
    ])
  })

  it('keeps every rule in its own group', () => {
    const groups = groupFindingsByRule(indexedFindings())

    for (const group of groups) {
      expect(
        group.items.every((item) => item.finding.ruleId === group.ruleId),
      ).toBe(true)
    }
  })

  it('does not modify original findings', () => {
    const findings = mixedFindings()
    const snapshot = JSON.stringify(findings)

    const indexed = selectFindingsBySeverity(findings, 'all')

    groupFindingsByRule(indexed)

    expect(JSON.stringify(findings)).toBe(snapshot)
    expect(indexed).toHaveLength(5)
  })

  it('preserves references to indexed items', () => {
    const indexed = indexedFindings()
    const groups = groupFindingsByRule(indexed)

    expect(groups[0].items[0]).toBe(indexed[0])
    expect(groups[0].items[1]).toBe(indexed[2])
    expect(groups[1].items[0]).toBe(indexed[1])
  })

  it('retains repeated findings independently', () => {
    const finding = makeFinding()

    const indexed = selectFindingsBySeverity([finding, finding, finding], 'all')

    const groups = groupFindingsByRule(indexed)

    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)

    expect(groups[0].items.map((item) => item.originalIndex)).toEqual([0, 1, 2])
  })

  it('creates new group containers on repeated calls', () => {
    const indexed = indexedFindings()

    const first = groupFindingsByRule(indexed)
    const second = groupFindingsByRule(indexed)

    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(second[0]).not.toBe(first[0])
    expect(second[0].items).not.toBe(first[0].items)
    expect(second[0].items[0]).toBe(first[0].items[0])
  })

  it('groups only findings selected by severity', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const groups = groupFindingsByRule(warnings)

    expect(groups.map((group) => group.ruleId)).toEqual(['R09'])
    expect(groups[0].items).toHaveLength(2)
  })

  it('groups only findings selected by confidence', () => {
    const high = selectFindingsByConfidence(indexedFindings(), 'high')

    const groups = groupFindingsByRule(high)

    expect(groups.map((group) => group.ruleId)).toEqual(['R09', 'R01'])
    expect(
      groups.flatMap((group) => group.items.map((item) => item.originalIndex)),
    ).toEqual([0, 3])
  })

  it('groups only findings matching the search', () => {
    const matching = selectFindingsBySearch(indexedFindings(), 'cycle')

    const groups = groupFindingsByRule(matching)

    expect(groups).toHaveLength(1)
    expect(groups[0].ruleId).toBe('R07')
    expect(groups[0].items.map((item) => item.originalIndex)).toEqual([1, 4])
  })

  it('works after applying all three selection criteria', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const high = selectFindingsByConfidence(warnings, 'high')

    const matching = selectFindingsBySearch(high, 'identifier')

    const groups = groupFindingsByRule(matching)

    expect(groups).toHaveLength(1)
    expect(groups[0].ruleId).toBe('R09')
    expect(groups[0].items).toHaveLength(1)
    expect(groups[0].items[0].originalIndex).toBe(0)
  })

  it('returns no groups when filters have no matches', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const low = selectFindingsByConfidence(warnings, 'low')

    const matching = selectFindingsBySearch(low, 'cycle')

    expect(groupFindingsByRule(matching)).toEqual([])
  })

  it('groups actual R02 and R10 audit findings', () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: 'id-a',
          name: '',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'id-b',
          name: '',
          type: 'example.node',
          typeVersion: 1,
          position: [200, 0],
          parameters: {},
        },
      ],
      connections: {},
    })

    const result = auditWorkflowJson(raw)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R02',
      'R10',
      'R10',
    ])

    const groups = groupFindingsByRule(
      selectFindingsBySeverity(result.findings, 'all'),
    )

    expect(groups.map((group) => group.ruleId)).toEqual(['R02', 'R10'])

    expect(groups.map((group) => group.items.length)).toEqual([1, 2])

    expect(result.findings).toHaveLength(3)
  })

  it('renders a labelled view-mode selector', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Results view')
    expect(html).toContain('name="finding-view-mode"')

    const selectorId = html.match(
      /<label[^>]*for="([^"]+)"[^>]*>Results view<\/label>/,
    )?.[1]

    expect(selectorId).toBeDefined()
    expect(html).toContain(`id="${selectorId}"`)
  })

  it('starts in list mode with all cards', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('value="list"')
    expect(html).toContain('value="grouped"')
    expect(html).toContain('Grouped by rule')
    expect(html).toContain('Showing 5 of 5 findings.')
    expect(html.match(/<li\b/g)).toHaveLength(5)
    expect(html).not.toContain('class="wi-finding-groups"')
  })

  it('hides view controls when there are no findings', () => {
    const html = renderFindings([])

    expect(html).toContain('No findings were detected by the executed rules.')

    expect(html).not.toContain('Results view')
    expect(html).not.toContain('finding-view-mode')
    expect(html).not.toContain('<li')
  })

  it('does not show view controls before an audit', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Results view')
  })
})
