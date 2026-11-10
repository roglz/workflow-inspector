import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import { FindingList } from './finding-list'
import {
  parseFindingSeverityFilter,
  selectFindingsBySeverity,
} from './finding-severity-filter'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'R09',
    severity: 'warning',
    confidence: 'high',
    title: 'Missing node ID',
    description: 'Node at position 1 has no identifier.',
    recommendation: 'Assign a non-blank identifier.',
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
      title: 'Missing ID',
    }),
    makeFinding({
      ruleId: 'R03',
      severity: 'error',
      title: 'Dangling reference',
    }),
    makeFinding({
      ruleId: 'R08',
      severity: 'warning',
      title: 'Duplicate connection',
    }),
  ]
}

function renderFindings(findings: readonly Finding[]): string {
  return renderToStaticMarkup(<FindingList findings={findings} />)
}

describe('Stage 4 - Finding severity filters', () => {
  it('accepts the all filter', () => {
    expect(parseFindingSeverityFilter('all')).toBe('all')
  })

  it('accepts the error filter', () => {
    expect(parseFindingSeverityFilter('error')).toBe('error')
  })

  it('accepts the warning filter', () => {
    expect(parseFindingSeverityFilter('warning')).toBe('warning')
  })

  it('accepts the info filter', () => {
    expect(parseFindingSeverityFilter('info')).toBe('info')
  })

  it('uses all for an unknown filter', () => {
    expect(parseFindingSeverityFilter('SENTINEL_UNKNOWN_FILTER')).toBe('all')
  })

  it('does not normalize filter values by changing case', () => {
    expect(parseFindingSeverityFilter('ERROR')).toBe('all')
  })

  it('selects every finding with the all filter', () => {
    const selected = selectFindingsBySeverity(mixedFindings(), 'all')

    expect(selected).toHaveLength(4)
    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([
      0, 1, 2, 3,
    ])
  })

  it('selects only error findings', () => {
    const selected = selectFindingsBySeverity(mixedFindings(), 'error')

    expect(selected).toHaveLength(1)
    expect(selected[0].finding.severity).toBe('error')
    expect(selected[0].originalIndex).toBe(2)
  })

  it('selects only warning findings', () => {
    const selected = selectFindingsBySeverity(mixedFindings(), 'warning')

    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([1, 3])

    expect(
      selected.every(({ finding }) => finding.severity === 'warning'),
    ).toBe(true)
  })

  it('selects only informational findings', () => {
    const selected = selectFindingsBySeverity(mixedFindings(), 'info')

    expect(selected).toHaveLength(1)
    expect(selected[0].finding.ruleId).toBe('R07')
  })

  it('handles an empty source collection', () => {
    expect(selectFindingsBySeverity([], 'all')).toEqual([])
    expect(selectFindingsBySeverity([], 'warning')).toEqual([])
  })

  it('returns no results when a filter has no matches', () => {
    const findings = [makeFinding({ severity: 'info' })]

    expect(selectFindingsBySeverity(findings, 'error')).toEqual([])
  })

  it('preserves the original relative order', () => {
    const selected = selectFindingsBySeverity(mixedFindings(), 'warning')

    expect(selected.map(({ finding }) => finding.title)).toEqual([
      'Missing ID',
      'Duplicate connection',
    ])
  })

  it('preserves repeated references as separate results', () => {
    const finding = makeFinding()
    const findings = [finding, finding, finding]

    const selected = selectFindingsBySeverity(findings, 'warning')

    expect(selected).toHaveLength(3)
    expect(selected.map(({ originalIndex }) => originalIndex)).toEqual([
      0, 1, 2,
    ])

    expect(selected.every((item) => item.finding === finding)).toBe(true)
  })

  it('does not modify the original findings', () => {
    const findings = mixedFindings()
    const snapshot = JSON.stringify(findings)

    selectFindingsBySeverity(findings, 'warning')
    selectFindingsBySeverity(findings, 'error')

    expect(JSON.stringify(findings)).toBe(snapshot)
  })

  it('retains original object references in a new array', () => {
    const findings = mixedFindings()

    const selected = selectFindingsBySeverity(findings, 'all')

    expect(selected[0].finding).toBe(findings[0])

    selected.pop()

    expect(findings).toHaveLength(4)
  })

  it('renders an accessible labelled selector', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Filter by severity')
    expect(html).toContain('name="finding-severity-filter"')

    const labelId = html.match(/<label[^>]*for="([^"]+)"/)?.[1]

    expect(labelId).toBeDefined()
    expect(html).toContain(`id="${labelId}"`)
  })

  it('renders all four filter options', () => {
    const html = renderFindings(mixedFindings())

    for (const value of ['all', 'error', 'warning', 'info']) {
      expect(html).toContain(`value="${value}"`)
    }

    expect(html).toContain('All severities')
    expect(html).toContain('Errors')
    expect(html).toContain('Warnings')
    expect(html).toContain('Information')
  })

  it('shows all findings by default with the full count', () => {
    const html = renderFindings(mixedFindings())

    expect(html).toContain('Showing 4 of 4 findings.')
    expect(html.match(/<li\b/g)).toHaveLength(4)
    expect(html).toContain('Cycle')
    expect(html).toContain('Missing ID')
    expect(html).toContain('Dangling reference')
    expect(html).toContain('Duplicate connection')
  })

  it('preserves the empty audit state without a selector', () => {
    const html = renderFindings([])

    expect(html).toContain('No findings were detected by the executed rules.')

    expect(html).not.toContain('name="finding-severity-filter"')
    expect(html).not.toContain('Showing')
    expect(html).not.toContain('<li')
  })

  it('does not render filters in the initial App screen', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Filter by severity')
  })

  it('filters a real audit without changing its total', () => {
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

    const informational = selectFindingsBySeverity(result.findings, 'info')

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    expect(informational.map(({ finding }) => finding.ruleId)).toEqual(['R07'])

    expect(warnings.map(({ finding }) => finding.ruleId)).toEqual(['R09'])

    expect(result.findings).toHaveLength(2)
  })
})
