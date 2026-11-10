import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import { FindingList } from './finding-list'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'R09',
    severity: 'warning',
    confidence: 'high',
    title: 'Missing or blank node identifier',
    description: 'Node at position 1 is missing an identifier.',
    recommendation:
      'Assign a non-blank identifier that is unique within the workflow.',
    nodeIndex: 0,
    ...overrides,
  }
}

function renderFindings(findings: readonly Finding[]): string {
  return renderToStaticMarkup(<FindingList findings={findings} />)
}

function inputNode(name: string, id?: string) {
  return {
    ...(id === undefined ? {} : { id }),
    name,
    type: 'example.node',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }
}

describe('Stage 4 - Detailed findings list', () => {
  it('renders an empty-state message', () => {
    const html = renderFindings([])

    expect(html).toContain('Finding details')
    expect(html).toContain('No findings were detected by the executed rules.')
  })

  it('does not render finding cards for an empty list', () => {
    const html = renderFindings([])

    expect(html).not.toContain('<li')
    expect(html).not.toContain('Recommendation:')
  })

  it('renders every supported finding field', () => {
    const html = renderFindings([makeFinding()])

    expect(html).toContain('R09')
    expect(html).toContain('Warning')
    expect(html).toContain('Confidence: High')
    expect(html).toContain('Node 1')
    expect(html).toContain('Missing or blank node identifier')
    expect(html).toContain('Node at position 1 is missing an identifier.')
    expect(html).toContain('Recommendation:')
    expect(html).toContain('Assign a non-blank identifier')
  })

  it('renders the error severity label', () => {
    const html = renderFindings([makeFinding({ severity: 'error' })])

    expect(html).toContain('wi-finding-card--error')
    expect(html).toContain('wi-finding-severity--error')
    expect(html).toContain('Error')
  })

  it('renders the warning severity label', () => {
    const html = renderFindings([makeFinding({ severity: 'warning' })])

    expect(html).toContain('wi-finding-card--warning')
    expect(html).toContain('Warning')
  })

  it('renders the information severity label', () => {
    const html = renderFindings([makeFinding({ severity: 'info' })])

    expect(html).toContain('wi-finding-card--info')
    expect(html).toContain('Information')
  })

  it('renders high confidence', () => {
    const html = renderFindings([makeFinding({ confidence: 'high' })])

    expect(html).toContain('Confidence: High')
  })

  it('renders medium confidence', () => {
    const html = renderFindings([makeFinding({ confidence: 'medium' })])

    expect(html).toContain('Confidence: Medium')
  })

  it('renders low confidence', () => {
    const html = renderFindings([makeFinding({ confidence: 'low' })])

    expect(html).toContain('Confidence: Low')
  })

  it('converts zero-based node indices to one-based labels', () => {
    const html = renderFindings([makeFinding({ nodeIndex: 0 })])

    expect(html).toContain('Node 1')
    expect(html).not.toContain('Node 0')
  })

  it('renders the correct label for a later node', () => {
    const html = renderFindings([makeFinding({ nodeIndex: 3 })])

    expect(html).toContain('Node 4')
  })

  it('omits the node label when nodeIndex is absent', () => {
    const finding = makeFinding()

    delete finding.nodeIndex

    const html = renderFindings([finding])

    expect(html).toContain('R09')
    expect(html).not.toContain('wi-finding-node')
  })

  it('preserves the original order of findings', () => {
    const html = renderFindings([
      makeFinding({
        ruleId: 'R01',
        title: 'FIRST_FINDING',
      }),
      makeFinding({
        ruleId: 'R07',
        severity: 'info',
        title: 'SECOND_FINDING',
      }),
      makeFinding({
        ruleId: 'R09',
        title: 'THIRD_FINDING',
      }),
    ])

    expect(html.indexOf('FIRST_FINDING')).toBeLessThan(
      html.indexOf('SECOND_FINDING'),
    )
    expect(html.indexOf('SECOND_FINDING')).toBeLessThan(
      html.indexOf('THIRD_FINDING'),
    )
  })

  it('preserves repeated findings as separate cards', () => {
    const finding = makeFinding()
    const html = renderFindings([finding, finding, finding])

    expect(html.match(/<li\b/g)).toHaveLength(3)
  })

  it('escapes markup instead of interpreting HTML', () => {
    const malicious = '<img src=x onerror=alert(1)>'

    const html = renderFindings([
      makeFinding({
        title: malicious,
        description: malicious,
        recommendation: malicious,
      }),
    ])

    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('dangerouslySetInnerHTML')
  })

  it('does not modify the findings array or its objects', () => {
    const findings = [
      makeFinding(),
      makeFinding({
        ruleId: 'R07',
        severity: 'info',
        confidence: 'medium',
        nodeIndex: 2,
      }),
    ]

    const original = JSON.stringify(findings)

    renderFindings(findings)

    expect(JSON.stringify(findings)).toBe(original)
  })

  it('renders an actual R09 audit result', () => {
    const raw = JSON.stringify({
      nodes: [inputNode('Source')],
      connections: {},
    })

    const result = auditWorkflowJson(raw)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    const html = renderFindings(result.findings)

    expect(html).toContain('R09')
    expect(html).toContain('Warning')
    expect(html).toContain('Confidence: High')
    expect(html).toContain('Node 1')
    expect(html).toContain('Node at position 1 is missing an identifier.')
  })

  it('renders actual R02 and R10 findings in rule order', () => {
    const raw = JSON.stringify({
      nodes: [inputNode('', 'id-a'), inputNode('', 'id-b')],
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

    const html = renderFindings(result.findings)

    expect(html.match(/<li\b/g)).toHaveLength(3)
    expect(html.indexOf('R02')).toBeLessThan(html.indexOf('R10'))
  })

  it('does not display results in the initial App screen', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Finding details')
    expect(html).not.toContain('No findings were detected')
  })
})
