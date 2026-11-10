import { useState } from 'react'

import { downloadAuditReport, type SuccessfulAudit } from './audit-report'

interface AuditReportDownloadProps {
  result: SuccessfulAudit
}

export function AuditReportDownload({ result }: AuditReportDownloadProps) {
  const [downloadFailed, setDownloadFailed] = useState(false)

  function handleDownload() {
    try {
      downloadAuditReport(result)
      setDownloadFailed(false)
    } catch {
      setDownloadFailed(true)
    }
  }

  return (
    <div className="wi-report-export">
      <div className="wi-actions">
        <button className="wi-submit" type="button" onClick={handleDownload}>
          Export JSON report
        </button>

        <p className="wi-privacy">
          Includes all audit findings without the original workflow JSON.
        </p>
      </div>

      {downloadFailed && (
        <p className="wi-message wi-message--error" role="alert">
          The report download could not be started.
        </p>
      )}
    </div>
  )
}
