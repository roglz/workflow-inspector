import type { AuditWorkflowResult } from '../../core/audit/audit-workflow-json'
import type { Finding } from '../../core/models/finding'

export type SuccessfulAudit = Extract<AuditWorkflowResult, { success: true }>

export const AUDIT_REPORT_FILENAME = 'workflow-inspector-report.json'

export const AUDIT_REPORT_MIME_TYPE = 'application/json;charset=utf-8'

export interface AuditReport {
  readonly formatVersion: 1
  readonly nodeCount: number
  readonly findingCount: number
  readonly findings: readonly Finding[]
}

export type AuditReportSaver = (blob: Blob, filename: string) => void

export function createAuditReport(result: SuccessfulAudit): AuditReport {
  return {
    formatVersion: 1,
    nodeCount: result.nodeCount,
    findingCount: result.findings.length,
    findings: result.findings.map((finding) => ({
      ruleId: finding.ruleId,
      severity: finding.severity,
      confidence: finding.confidence,
      title: finding.title,
      description: finding.description,
      recommendation: finding.recommendation,
      ...(finding.nodeIndex === undefined
        ? {}
        : { nodeIndex: finding.nodeIndex }),
    })),
  }
}

export function serializeAuditReport(result: SuccessfulAudit): string {
  return `${JSON.stringify(createAuditReport(result), null, 2)}\n`
}

function saveBlobInBrowser(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.hidden = true

  try {
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()

    // Allow the browser to begin the download before
    // releasing the temporary object URL.
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 1000)
  }
}

export function downloadAuditReport(
  result: SuccessfulAudit,
  save: AuditReportSaver = saveBlobInBrowser,
): void {
  const content = serializeAuditReport(result)

  const blob = new Blob([content], {
    type: AUDIT_REPORT_MIME_TYPE,
  })

  save(blob, AUDIT_REPORT_FILENAME)
}
