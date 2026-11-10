import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import { FindingList } from './finding-list'
import {
  parseFindingConfidenceFilter,
  selectFindingsByConfidence,
} from './finding-confidence-filter'
import { selectFindingsBySeverity } from './finding-severity-filter'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'R09',
    severity: 'warning',
    confidence: 'high',
    title: 'Missing node ID',
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
      title: 'Cycle',
    }),
    makeFinding({
      ruleId: 'R09',
      severity: 'warning',
      confidence: 'high',
      title: 'Missing ID',
    }),
    makeFinding({
      ruleId: 'R03',
      severity: 'error',
      confidence: 'high',
      title: 'Dangling reference',
    }),
    makeFinding({
      ruleId: 'R08',
      severity: 'warning',
      confidence: 'low',
      title: 'Duplicate connection',
    }),
    makeFinding({
      ruleId: 'R01',
      severity: 'error',
      confidence: 'medium',
      title: 'Duplicate ID',
    }),
  ]
}

function renderFindings(findings: readonly Finding[]): string {
  return renderToStaticMarkup(<FindingList findings={findings} />)
}

describe('Stage 4 - Finding confidence filters', () => {
  it('accepts the all confidence filter', () => {
    expect(parseFindingConfidenceFilter('all')).toBe('all')
  })

  it('accepts high confidence', () => {
    expect(parseFindingConfidenceFilter('high')).toBe('high')
  })

  it('accepts medium confidence', () => {
    expect(parseFindingConfidenceFilter('medium')).toBe('medium')
  })

  it('accepts low confidence', () => {
    expect(parseFindingConfidenceFilter('low')).toBe('low')
  })

  it('defaults unknown values to all', () => {
    expect(parseFindingConfidenceFilter('SENTINEL_UNKNOWN_CONFIDENCE')).toBe(
      'all',
    )
  })

  it('does not accept uppercase variants', () => {
    expect(parseFindingConfidenceFilter('HIGH')).toBe('all')
  })

  it('handles an empty collection', () => {
    const indexed = selectFindingsBySeverity([], 'all')

    expect(selectFindingsByConfidence(indexed, 'all')).toEqual([])

    expect(selectFindingsByConfidence(indexed, 'high')).toEqual([])
  })

  it('returns all findings for the all confidence filter', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'all')

    expect(selected).toHaveLength(5)
    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([
      0, 1, 2, 3, 4,
    ])
  })

  it('selects only high-confidence findings', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'high')

    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([1, 2])

    expect(selected.every(({ finding }) => finding.confidence === 'high')).toBe(
      true,
    )
  })

  it('selects only medium-confidence findings', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'medium')

    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([0, 4])
  })

  it('selects only low-confidence findings', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'low')

    expect(selected).toHaveLength(1)
    expect(selected[0].finding.ruleId).toBe('R08')
    expect(selected[0].originalIndex).toBe(3)
  })

  it('returns no results when confidence does not match', () => {
    const indexed = selectFindingsBySeverity(
      [makeFinding({ confidence: 'high' })],
      'all',
    )

    expect(selectFindingsByConfidence(indexed, 'low')).toEqual([])
  })

  it('preserves relative order for matching findings', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'medium')

    expect(selected.map(({ finding }) => finding.title)).toEqual([
      'Cycle',
      'Duplicate ID',
    ])
  })

  it('preserves indices after filtering by severity', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const selected = selectFindingsByConfidence(warnings, 'high')

    expect(selected).toHaveLength(1)
    expect(selected[0].finding.ruleId).toBe('R09')
    expect(selected[0].originalIndex).toBe(1)
  })

  it('combines severity and confidence with AND logic', () => {
    const errors = selectFindingsBySeverity(mixedFindings(), 'error')

    const selected = selectFindingsByConfidence(errors, 'medium')

    expect(selected.map(({ finding }) => finding.ruleId)).toEqual(['R01'])
  })

  it('returns no results for incompatible combined filters', () => {
    const warnings = selectFindingsBySeverity(mixedFindings(), 'warning')

    const selected = selectFindingsByConfidence(warnings, 'medium')

    expect(selected).toEqual([])
    expect(warnings).toHaveLength(2)
  })

  it('does not modify the original finding collection', () => {
    const findings = mixedFindings()
    const snapshot = JSON.stringify(findings)

    const indexed = selectFindingsBySeverity(findings, 'warning')

    selectFindingsByConfidence(indexed, 'high')
    selectFindingsByConfidence(indexed, 'low')

    expect(JSON.stringify(findings)).toBe(snapshot)
    expect(indexed).toHaveLength(2)
  })

  it('preserves repeated findings as separate results', () => {
    const finding = makeFinding()
    const indexed = selectFindingsBySeverity([finding, finding, finding], 'all')

    const selected = selectFindingsByConfidence(indexed, 'high')

    expect(selected).toHaveLength(3)
    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([
      0, 1, 2,
    ])

    expect(selected.every((item) => item.finding === finding)).toBe(true)
  })

  it('returns a new array with the existing item references', () => {
    const indexed = selectFindingsBySeverity(mixedFindings(), 'all')

    const selected = selectFindingsByConfidence(indexed, 'all')

    expect(selected).not.toBe(indexed)
    expect(selected[0]).toBe(indexed[0])

    selected.pop()

    expect(indexed).toHaveLength(5)
  })

  it('renders an accessible confidence selector', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Filter by confidence')
    expect(html).toContain('name="finding-confidence-filter"')

    const labelId = html.match(
      /<label[^>]*for="([^"]+)"[^>]*>Filter by confidence<\/label>/,
    )?.[1]

    expect(labelId).toBeDefined()
    expect(html).toContain(`id="${labelId}"`)
  })

  it('renders every confidence option', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('All confidence levels')
    expect(html).toContain('value="high"')
    expect(html).toContain('value="medium"')
    expect(html).toContain('value="low"')
    expect(html).toContain('>High</option>')
    expect(html).toContain('>Medium</option>')
    expect(html).toContain('>Low</option>')
  })

  it('shows both filters and all findings initially', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Filter by severity')
    expect(html).toContain('Filter by confidence')
    expect(html).toContain('Showing 5 of 5 findings.')
    expect(html.match(/<li\b/g)).toHaveLength(5)
  })

  it('does not show filters for an audit with zero findings', () => {
    const html = renderFindings([])

    expect(html).toContain('No findings were detected by the executed rules.')

    expect(html).not.toContain('Filter by severity')
    expect(html).not.toContain('Filter by confidence')
    expect(html).not.toContain('<li')
  })

  it('does not show filters in the initial App screen', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Filter by confidence')
  })

  it('filters real R07 and R09 findings independently', () => {
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

    const all = selectFindingsBySeverity(result.findings, 'all')

    const medium = selectFindingsByConfidence(all, 'medium')

    const high = selectFindingsByConfidence(all, 'high')

    expect(medium.map(({ finding }) => finding.ruleId)).toEqual(['R07'])

    expect(high.map(({ finding }) => finding.ruleId)).toEqual(['R09'])

    expect(result.findings).toHaveLength(2)
  })
})
