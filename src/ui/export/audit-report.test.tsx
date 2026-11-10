import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from '../../App'
import { auditWorkflowJson } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'
import {
  AUDIT_REPORT_FILENAME,
  AUDIT_REPORT_MIME_TYPE,
  createAuditReport,
  downloadAuditReport,
  serializeAuditReport,
  type AuditReport,
  type SuccessfulAudit,
} from './audit-report'
import { AuditReportDownload } from './audit-report-download'

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

function makeResult(
  nodeCount = 2,
  findings: Finding[] = [makeFinding()],
): SuccessfulAudit {
  return {
    success: true,
    nodeCount,
    findings,
  }
}

describe('Stage 4 - Local audit report export', () => {
  it('uses report format version 1', () => {
    const report = createAuditReport(makeResult())

    expect(report.formatVersion).toBe(1)
  })

  it('supports an empty successful audit', () => {
    const report = createAuditReport(makeResult(0, []))

    expect(report).toEqual({
      formatVersion: 1,
      nodeCount: 0,
      findingCount: 0,
      findings: [],
    })
  })

  it('counts nodes and findings independently', () => {
    const report = createAuditReport(
      makeResult(12, [makeFinding(), makeFinding()]),
    )

    expect(report.nodeCount).toBe(12)
    expect(report.findingCount).toBe(2)
  })

  it('copies every supported finding field', () => {
    const report = createAuditReport(makeResult())

    expect(report.findings[0]).toEqual(makeFinding())

    expect(Object.keys(report.findings[0])).toEqual([
      'ruleId',
      'severity',
      'confidence',
      'title',
      'description',
      'recommendation',
      'nodeIndex',
    ])
  })

  it('omits nodeIndex when it is absent', () => {
    const finding = makeFinding()
    delete finding.nodeIndex

    const report = createAuditReport(makeResult(1, [finding]))

    expect(report.findings[0]).not.toHaveProperty('nodeIndex')
  })

  it('preserves a zero-based node index', () => {
    const report = createAuditReport(
      makeResult(1, [makeFinding({ nodeIndex: 0 })]),
    )

    expect(report.findings[0].nodeIndex).toBe(0)
  })

  it('preserves finding order', () => {
    const report = createAuditReport(
      makeResult(3, [
        makeFinding({ ruleId: 'R02' }),
        makeFinding({ ruleId: 'R09' }),
        makeFinding({ ruleId: 'R10' }),
      ]),
    )

    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      'R02',
      'R09',
      'R10',
    ])
  })

  it('preserves repeated findings', () => {
    const finding = makeFinding()
    const report = createAuditReport(makeResult(1, [finding, finding, finding]))

    expect(report.findingCount).toBe(3)
    expect(report.findings).toHaveLength(3)
  })

  it('does not modify the original audit result', () => {
    const result = makeResult()
    const snapshot = JSON.stringify(result)

    createAuditReport(result)
    serializeAuditReport(result)

    expect(JSON.stringify(result)).toBe(snapshot)
  })

  it('creates new report and finding objects', () => {
    const result = makeResult()
    const report = createAuditReport(result)

    expect(report.findings).not.toBe(result.findings)
    expect(report.findings[0]).not.toBe(result.findings[0])

    expect(createAuditReport(result)).not.toBe(report)
  })

  it('excludes unexpected fields from the report', () => {
    const secret = 'SENTINEL_PRIVATE_EXTRA_FIELD'

    const result = {
      ...makeResult(),
      rawJson: secret,
      findings: [
        {
          ...makeFinding(),
          nodeName: secret,
          parameters: {
            token: secret,
          },
        },
      ],
    }

    const json = serializeAuditReport(result)

    expect(json).not.toContain(secret)
    expect(json).not.toContain('rawJson')
    expect(json).not.toContain('parameters')
    expect(json).not.toContain('nodeName')
  })

  it('does not reveal raw values from a real audit', () => {
    const secret = 'SENTINEL_PRIVATE_EXPORT_WORKFLOW'

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

    const result = auditWorkflowJson(raw)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    const json = serializeAuditReport(result)

    expect(json).toContain('"ruleId": "R09"')
    expect(json).not.toContain(secret)
    expect(json).not.toContain('"token"')
  })

  it('serializes a valid JSON document', () => {
    const result = makeResult()
    const json = serializeAuditReport(result)
    const parsed = JSON.parse(json) as AuditReport

    expect(parsed).toEqual(createAuditReport(result))
  })

  it('uses readable indentation and a final newline', () => {
    const json = serializeAuditReport(makeResult())

    expect(json).toContain('  "formatVersion": 1')
    expect(json).toContain('    {')
    expect(json.endsWith('\n')).toBe(true)
  })

  it('serializes identical results deterministically', () => {
    const result = makeResult()

    expect(serializeAuditReport(result)).toBe(serializeAuditReport(result))
  })

  it('preserves Unicode text in the exported report', () => {
    const result = makeResult(1, [
      makeFinding({
        title: 'Identificador inválido',
        recommendation: 'Revisa la configuración.',
      }),
    ])

    const json = serializeAuditReport(result)

    expect(json).toContain('Identificador inválido')
    expect(json).toContain('configuración')
  })

  it('uses a fixed filename without workflow data', () => {
    expect(AUDIT_REPORT_FILENAME).toBe('workflow-inspector-report.json')
  })

  it('uses the JSON UTF-8 MIME type', () => {
    expect(AUDIT_REPORT_MIME_TYPE).toBe('application/json;charset=utf-8')
  })

  it('invokes the download adapter exactly once', () => {
    const saved: string[] = []

    downloadAuditReport(makeResult(), (_blob, filename) => {
      saved.push(filename)
    })

    expect(saved).toEqual([AUDIT_REPORT_FILENAME])
  })

  it('creates a Blob with the correct MIME type', () => {
    let savedBlob: Blob | undefined

    downloadAuditReport(makeResult(), (blob) => {
      savedBlob = blob
    })

    expect(savedBlob).toBeInstanceOf(Blob)
    expect(savedBlob?.type).toBe(AUDIT_REPORT_MIME_TYPE)
  })

  it('places the exact serialized report in the Blob', async () => {
    const result = makeResult()
    let savedBlob: Blob | undefined

    downloadAuditReport(result, (blob) => {
      savedBlob = blob
    })

    if (!savedBlob) {
      throw new Error('Expected a report Blob')
    }

    expect(await savedBlob.text()).toBe(serializeAuditReport(result))
  })

  it('allows downloading an audit with zero findings', async () => {
    let savedBlob: Blob | undefined

    downloadAuditReport(makeResult(0, []), (blob) => {
      savedBlob = blob
    })

    if (!savedBlob) {
      throw new Error('Expected a report Blob')
    }

    const parsed = JSON.parse(await savedBlob.text()) as AuditReport

    expect(parsed.nodeCount).toBe(0)
    expect(parsed.findingCount).toBe(0)
    expect(parsed.findings).toEqual([])
  })

  it('propagates a download adapter failure', () => {
    expect(() =>
      downloadAuditReport(makeResult(), () => {
        throw new Error('Simulated download failure')
      }),
    ).toThrow('Simulated download failure')
  })

  it('renders a button that does not submit the form', () => {
    const html = renderToStaticMarkup(
      <AuditReportDownload result={makeResult()} />,
    )

    expect(html).toContain('Export JSON report')
    expect(html).toContain('type="button"')
    expect(html).not.toContain('type="submit"')
  })

  it('explains that the export uses complete findings', () => {
    const html = renderToStaticMarkup(
      <AuditReportDownload result={makeResult()} />,
    )

    expect(html).toContain('Includes all audit findings')
    expect(html).toContain('without the original workflow JSON')
    expect(html).not.toContain('role="alert"')
  })

  it('does not show export before the initial App audit', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze JSON')
    expect(html).not.toContain('Export JSON report')
  })
})
