import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import { FindingList } from './finding-list'
import { selectFindingsByConfidence } from './finding-confidence-filter'
import { selectFindingsBySearch } from './finding-search'
import { selectFindingsBySeverity } from './finding-severity-filter'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'R09',
    severity: 'warning',
    confidence: 'high',
    title: 'Missing ID',
    description: 'Node has no identifier.',
    recommendation: 'Assign a unique identifier.',
    nodeIndex: 0,
    ...overrides,
  }
}

function mixedFindings(): Finding[] {
  return [
    makeFinding({
      ruleId: 'R07',
      severity: 'info',
      confidence: 'medium',
      title: 'Directed cycle',
      description: 'Main connection returns to first node.',
      recommendation: 'Inspect cyclic flow.',
    }),
    makeFinding({
      ruleId: 'R09',
      severity: 'warning',
      confidence: 'high',
      title: 'Missing identifier',
      description: 'A node has no ID.',
      recommendation: 'Assign a unique identifier.',
    }),
    makeFinding({
      ruleId: 'R03',
      severity: 'error',
      confidence: 'high',
      title: 'Dangling reference',
      description: 'Connection target not found.',
      recommendation: 'Review target names.',
    }),
    makeFinding({
      ruleId: 'R08',
      severity: 'warning',
      confidence: 'low',
      title: 'Duplicated connection',
      description: 'Repeated branch entry.',
      recommendation: 'Remove redundant edges.',
    }),
    makeFinding({
      ruleId: 'R01',
      severity: 'error',
      confidence: 'medium',
      title: 'Duplicate identifier',
      description: 'Two nodes share an ID.',
      recommendation: 'Assign distinct IDs.',
    }),
  ]
}

function allIndexed() {
  return selectFindingsBySeverity(mixedFindings(), 'all')
}

function selectedRuleIds(query: string) {
  return selectFindingsBySearch(allIndexed(), query).map(
    ({ finding }) => finding.ruleId,
  )
}

function renderFindings(findings: readonly Finding[]): string {
  return renderToStaticMarkup(<FindingList findings={findings} />)
}

describe('Stage 4 - Local finding search', () => {
  it('returns all findings for an empty query', () => {
    expect(selectedRuleIds('')).toEqual(['R07', 'R09', 'R03', 'R08', 'R01'])
  })

  it('treats whitespace-only queries as empty', () => {
    expect(selectedRuleIds('  \t\n  ')).toEqual([
      'R07',
      'R09',
      'R03',
      'R08',
      'R01',
    ])
  })

  it('matches rule IDs without case sensitivity', () => {
    expect(selectedRuleIds('r09')).toEqual(['R09'])
  })

  it('supports partial rule ID matches', () => {
    expect(selectedRuleIds('09')).toEqual(['R09'])
  })

  it('searches finding titles', () => {
    expect(selectedRuleIds('directed cycle')).toEqual(['R07'])
  })

  it('searches finding descriptions', () => {
    expect(selectedRuleIds('target not found')).toEqual(['R03'])
  })

  it('searches finding recommendations', () => {
    expect(selectedRuleIds('redundant edges')).toEqual(['R08'])
  })

  it('ignores case differences in descriptive text', () => {
    expect(selectedRuleIds('MISSING IDENTIFIER')).toEqual(['R09'])
  })

  it('trims the query before searching', () => {
    expect(selectedRuleIds('  r03  ')).toEqual(['R03'])
  })

  it('ignores accents in searchable text', () => {
    const indexed = selectFindingsBySeverity(
      [
        makeFinding({
          title: 'Descripción única',
        }),
      ],
      'all',
    )

    const selected = selectFindingsBySearch(indexed, 'descripcion UNICA')

    expect(selected).toHaveLength(1)
  })

  it('handles an empty findings collection', () => {
    expect(selectFindingsBySearch([], 'R09')).toEqual([])
    expect(selectFindingsBySearch([], '')).toEqual([])
  })

  it('returns no matches for an unknown query', () => {
    expect(selectedRuleIds('SENTINEL_NO_SEARCH_MATCH')).toEqual([])
  })

  it('does not search confidence or node-position fields', () => {
    expect(selectedRuleIds('medium')).toEqual([])
    expect(selectedRuleIds('Node 5')).toEqual([])
  })

  it('preserves the relative order and original indices', () => {
    const selected = selectFindingsBySearch(allIndexed(), 'assign')

    expect(selected.map(({ finding }) => finding.ruleId)).toEqual([
      'R09',
      'R01',
    ])

    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([1, 4])
  })

  it('preserves repeated findings independently', () => {
    const finding = makeFinding()
    const indexed = selectFindingsBySeverity([finding, finding, finding], 'all')

    const selected = selectFindingsBySearch(indexed, 'R09')

    expect(selected).toHaveLength(3)

    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([
      0, 1, 2,
    ])
  })

  it('does not mutate the source findings', () => {
    const findings = mixedFindings()
    const snapshot = JSON.stringify(findings)

    const indexed = selectFindingsBySeverity(findings, 'all')

    selectFindingsBySearch(indexed, 'reference')

    expect(JSON.stringify(findings)).toBe(snapshot)
    expect(indexed).toHaveLength(5)
  })

  it('returns a new array for an empty query', () => {
    const indexed = allIndexed()
    const selected = selectFindingsBySearch(indexed, '')

    expect(selected).not.toBe(indexed)
    expect(selected).toHaveLength(5)
  })

  it('retains references to original indexed entries', () => {
    const indexed = allIndexed()
    const selected = selectFindingsBySearch(indexed, 'R09')

    expect(selected[0]).toBe(indexed[1])
    expect(selected[0].finding).toBe(indexed[1].finding)
  })

  it('combines correctly with severity filtering', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const selected = selectFindingsBySearch(warnings, 'duplicate')

    expect(selected.map(({ finding }) => finding.ruleId)).toEqual(['R08'])
  })

  it('combines correctly with confidence filtering', () => {
    const high = selectFindingsByConfidence(allIndexed(), 'high')

    const selected = selectFindingsBySearch(high, 'reference')

    expect(selected.map(({ finding }) => finding.ruleId)).toEqual(['R03'])
  })

  it('combines all three criteria with AND logic', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const high = selectFindingsByConfidence(warnings, 'high')

    const selected = selectFindingsBySearch(high, 'missing')

    expect(selected.map(({ finding }) => finding.ruleId)).toEqual(['R09'])
    expect(selected[0].originalIndex).toBe(1)
  })

  it('returns no matches for incompatible criteria', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const medium = selectFindingsByConfidence(warnings, 'medium')

    expect(selectFindingsBySearch(medium, 'missing')).toEqual([])
  })

  it('renders an accessible labelled search input', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Search findings')
    expect(html).toContain('type="search"')
    expect(html).toContain('name="finding-search"')

    const inputId = html.match(
      /<label[^>]*for="([^"]+)"[^>]*>Search findings<\/label>/,
    )?.[1]

    expect(inputId).toBeDefined()
    expect(html).toContain(`id="${inputId}"`)
  })

  it('renders search instructions and a placeholder', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('R09, title or recommendation')
    expect(html).toContain('Search by rule, title, description')
    expect(html).toContain('aria-describedby=')
  })

  it('shows all findings by default', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Filter by severity')
    expect(html).toContain('Filter by confidence')
    expect(html).toContain('Search findings')
    expect(html).toContain('Showing 5 of 5 findings.')
    expect(html.match(/<li\b/g)).toHaveLength(5)
  })

  it('does not render search for an empty audit', () => {
    const html = renderFindings([])

    expect(html).toContain('No findings were detected by the executed rules.')
    expect(html).not.toContain('Search findings')
    expect(html).not.toContain('type="search"')
  })

  it('does not render search before submitting App', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Search findings')
  })

  it('searches real audit findings without altering totals', () => {
    const raw = JSON.stringify({
      nodes: [
        {
          name: 'A',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'id-b',
          name: 'B',
          type: 'example.node',
          typeVersion: 1,
          position: [200, 0],
          parameters: {},
        },
      ],
      connections: {
        A: {
          main: [[{ node: 'B', type: 'main', index: 0 }]],
        },
        B: {
          main: [[{ node: 'A', type: 'main', index: 0 }]],
        },
      },
    })

    const result = auditWorkflowJson(raw)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R07',
      'R09',
    ])

    const indexed = selectFindingsBySeverity(result.findings, 'all')

    const cycle = selectFindingsBySearch(indexed, 'r07')

    const missingId = selectFindingsBySearch(indexed, 'r09')

    expect(cycle.map(({ finding }) => finding.ruleId)).toEqual(['R07'])

    expect(missingId.map(({ finding }) => finding.ruleId)).toEqual(['R09'])

    expect(result.findings).toHaveLength(2)
  })
})
