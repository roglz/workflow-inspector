import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'
import { auditWorkflowJson } from '../core/audit/audit-workflow-json'
import { readLocalJsonFile } from './audit-form/local-json-file'
import {
  AUDIT_REPORT_FILENAME,
  createAuditReport,
  downloadAuditReport,
  serializeAuditReport,
  type SuccessfulAudit,
} from './export/audit-report'
import { AuditReportDownload } from './export/audit-report-download'
import { selectFindingsByConfidence } from './findings/finding-confidence-filter'
import { FindingList } from './findings/finding-list'
import { groupFindingsByRule } from './findings/finding-rule-groups'
import { selectFindingsBySearch } from './findings/finding-search'
import { selectFindingsBySeverity } from './findings/finding-severity-filter'

const mixedWorkflowJson = JSON.stringify({
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

const blankNamesWorkflowJson = JSON.stringify({
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

function auditSuccessfully(raw: string): SuccessfulAudit {
  const result = auditWorkflowJson(raw)

  if (!result.success) {
    throw new Error('Expected a successful test audit')
  }

  return result
}

describe('Stage 4 - Complete UI integration', () => {
  it('starts with local inputs but no audit results', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('id="workflow-json"')
    expect(html).toContain('type="file"')
    expect(html).toContain('Analyze JSON')

    expect(html).not.toContain('Audit completed')
    expect(html).not.toContain('Finding details')
    expect(html).not.toContain('Export JSON report')
  })

  it('audits a valid workflow without nodes', () => {
    const result = auditSuccessfully('{"nodes":[],"connections":{}}')

    expect(result.nodeCount).toBe(0)
    expect(result.findings).toEqual([])
  })

  it('reads an imported file before auditing its text', async () => {
    const file = {
      name: 'workflow.json',
      size: new TextEncoder().encode(mixedWorkflowJson).length,
      text: async () => mixedWorkflowJson,
    }

    const imported = await readLocalJsonFile(file)

    expect(imported.success).toBe(true)

    if (!imported.success) {
      return
    }

    expect(imported.content).toBe(mixedWorkflowJson)

    const result = auditSuccessfully(imported.content)

    expect(result.nodeCount).toBe(2)
    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R07',
      'R09',
    ])
  })

  it('rejects an unsupported file without reading it', async () => {
    const read = vi.fn(async () => mixedWorkflowJson)

    const result = await readLocalJsonFile({
      name: 'workflow.txt',
      size: 10,
      text: read,
    })

    expect(result).toEqual({
      success: false,
      code: 'INVALID_FILE_TYPE',
    })

    expect(read).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON at the audit boundary', () => {
    const result = auditWorkflowJson('{"nodes":')

    expect(result.success).toBe(false)
  })

  it('preserves real rule order and finding classifications', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    expect(result.nodeCount).toBe(2)

    expect(
      result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        severity: finding.severity,
        confidence: finding.confidence,
      })),
    ).toEqual([
      {
        ruleId: 'R07',
        severity: 'info',
        confidence: 'medium',
      },
      {
        ruleId: 'R09',
        severity: 'warning',
        confidence: 'high',
      },
    ])
  })

  it('filters the real result by severity', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    expect(warnings.map(({ finding }) => finding.ruleId)).toEqual(['R09'])

    expect(warnings[0].originalIndex).toBe(1)
    expect(result.findings).toHaveLength(2)
  })

  it('filters the real result by confidence', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const indexed = selectFindingsBySeverity(result.findings, 'all')

    const medium = selectFindingsByConfidence(indexed, 'medium')

    expect(medium.map(({ finding }) => finding.ruleId)).toEqual(['R07'])
  })

  it('searches the real result by rule ID', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const indexed = selectFindingsBySeverity(result.findings, 'all')

    const matching = selectFindingsBySearch(indexed, '  r09  ')

    expect(matching.map(({ finding }) => finding.ruleId)).toEqual(['R09'])
  })

  it('combines all three selection criteria', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    const high = selectFindingsByConfidence(warnings, 'high')

    const matching = selectFindingsBySearch(high, 'missing')

    expect(matching).toHaveLength(1)
    expect(matching[0].finding.ruleId).toBe('R09')
    expect(matching[0].originalIndex).toBe(1)
  })

  it('keeps the original findings when filters match nothing', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    const medium = selectFindingsByConfidence(warnings, 'medium')

    const matching = selectFindingsBySearch(medium, 'R09')

    expect(matching).toEqual([])

    expect(result.findings.map((finding) => finding.ruleId)).toEqual([
      'R07',
      'R09',
    ])
  })

  it('groups actual findings without losing repeated entries', () => {
    const result = auditSuccessfully(blankNamesWorkflowJson)

    const indexed = selectFindingsBySeverity(result.findings, 'all')

    const groups = groupFindingsByRule(indexed)

    expect(
      groups.map((group) => ({
        ruleId: group.ruleId,
        count: group.items.length,
      })),
    ).toEqual([
      { ruleId: 'R02', count: 1 },
      { ruleId: 'R10', count: 2 },
    ])

    expect(groups[1].items.map((item) => item.originalIndex)).toEqual([1, 2])
  })

  it('groups only findings remaining after filtering', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    const high = selectFindingsByConfidence(warnings, 'high')

    const matching = selectFindingsBySearch(high, 'R09')

    const groups = groupFindingsByRule(matching)

    expect(groups).toHaveLength(1)
    expect(groups[0].ruleId).toBe('R09')
    expect(groups[0].items).toHaveLength(1)
  })

  it('exports complete results despite active visual filtering', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const warnings = selectFindingsBySeverity(result.findings, 'warning')

    expect(warnings).toHaveLength(1)

    const report = createAuditReport(result)

    expect(report.nodeCount).toBe(2)
    expect(report.findingCount).toBe(2)

    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      'R07',
      'R09',
    ])
  })

  it('does not export raw workflow parameters or node names', () => {
    const secret = 'SENTINEL_PRIVATE_STAGE4'

    const raw = JSON.stringify({
      nodes: [
        {
          name: secret,
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {
            token: secret,
          },
        },
      ],
      connections: {},
    })

    const result = auditSuccessfully(raw)
    const json = serializeAuditReport(result)

    expect(json).toContain('"ruleId": "R09"')
    expect(json).not.toContain(secret)
    expect(json).not.toContain('"parameters"')
    expect(json).not.toContain('"token"')
  })

  it('creates a deterministic versioned report', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const first = serializeAuditReport(result)
    const second = serializeAuditReport(result)

    expect(first).toBe(second)

    const parsed = JSON.parse(first) as {
      formatVersion: number
      nodeCount: number
      findingCount: number
      findings: Array<{ ruleId: string }>
    }

    expect(parsed.formatVersion).toBe(1)
    expect(parsed.nodeCount).toBe(2)
    expect(parsed.findingCount).toBe(2)
    expect(parsed.findings).toHaveLength(2)
  })

  it('passes the complete serialized report to the download adapter', async () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    let savedBlob: Blob | undefined
    let savedFilename: string | undefined

    downloadAuditReport(result, (blob, filename) => {
      savedBlob = blob
      savedFilename = filename
    })

    expect(savedFilename).toBe(AUDIT_REPORT_FILENAME)

    if (!savedBlob) {
      throw new Error('Expected the report Blob')
    }

    expect(await savedBlob.text()).toBe(serializeAuditReport(result))
  })

  it('renders the successful result and export controls together', () => {
    const result = auditSuccessfully(mixedWorkflowJson)

    const html = renderToStaticMarkup(
      <>
        <AuditReportDownload result={result} />
        <FindingList findings={result.findings} />
      </>,
    )

    expect(html).toContain('Export JSON report')
    expect(html).toContain('Finding details')
    expect(html).toContain('Showing 2 of 2 findings.')
    expect(html).toContain('R07')
    expect(html).toContain('R09')
    expect(html).toContain('Filter by severity')
    expect(html).toContain('Filter by confidence')
    expect(html).toContain('Search findings')
    expect(html).toContain('Results view')
  })
})
