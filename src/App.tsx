import {
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'

import { AuditReportDownload } from './ui/export/audit-report-download'
import { FindingList } from './ui/findings/finding-list'
import {
  auditFormReducer,
  getSafeAuditErrorText,
  initialAuditFormState,
} from './ui/audit-form/audit-form-state'
import {
  createLocalJsonImportSession,
  getSafeLocalJsonFileErrorText,
  type LocalJsonFileErrorCode,
} from './ui/audit-form/local-json-file'

import './ui/audit-form/audit-form.css'
import './ui/audit-form/local-json-file.css'

type FileImportStatus =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'loaded' }
  | {
      kind: 'error'
      code: LocalJsonFileErrorCode
    }

export default function App() {
  const [state, dispatch] = useReducer(auditFormReducer, initialAuditFormState)

  const [fileStatus, setFileStatus] = useState<FileImportStatus>({
    kind: 'idle',
  })

  const importSession = useRef(createLocalJsonImportSession())

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    importSession.current.invalidate()
    setFileStatus({ kind: 'idle' })

    dispatch({
      type: 'edit',
      value: event.currentTarget.value,
    })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]

    event.currentTarget.value = ''

    if (!file) {
      return
    }

    dispatch({
      type: 'edit',
      value: state.input,
    })

    setFileStatus({ kind: 'reading' })

    void importSession.current.readLatest(file, (result) => {
      if (!result.success) {
        setFileStatus({
          kind: 'error',
          code: result.code,
        })
        return
      }

      dispatch({
        type: 'edit',
        value: result.content,
      })

      setFileStatus({ kind: 'loaded' })
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (fileStatus.kind === 'reading') {
      return
    }

    setFileStatus({ kind: 'idle' })
    dispatch({ type: 'submit' })
  }

  return (
    <main className="wi-page">
      <div className="wi-container">
        <header className="wi-header">
          <p className="wi-eyebrow">Local n8n workflow audit</p>
          <h1>Workflow Inspector</h1>
          <p className="wi-introduction">
            Inspect the structure of an n8n workflow without running it or
            sending its contents to a server.
          </p>
        </header>

        <section className="wi-panel" aria-labelledby="wi-input-title">
          <h2 id="wi-input-title">Analyze workflow</h2>
          <p className="wi-description" id="workflow-json-help">
            Paste your workflow JSON to check it against the ten available
            rules.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label className="wi-label" htmlFor="workflow-json">
              Workflow JSON
            </label>

            <textarea
              id="workflow-json"
              name="workflow-json"
              className="wi-textarea"
              rows={14}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="workflow-json-help"
              placeholder='{"nodes":[],"connections":{}}'
              value={state.input}
              onChange={handleTextChange}
            />

            <div className="wi-file-import">
              <label className="wi-label" htmlFor="workflow-json-file">
                Or select a JSON file
              </label>

              <input
                id="workflow-json-file"
                name="workflow-json-file"
                className="wi-file-input"
                type="file"
                accept=".json,application/json"
                aria-describedby="workflow-json-file-help"
                onChange={handleFileChange}
              />

              <p className="wi-file-help" id="workflow-json-file-help">
                JSON files up to 5 MiB. Files are read only in your browser.
              </p>

              {fileStatus.kind === 'reading' && (
                <p className="wi-file-status" role="status">
                  Reading local file...
                </p>
              )}

              {fileStatus.kind === 'loaded' && (
                <p
                  className="wi-file-status wi-file-status--success"
                  role="status"
                >
                  File loaded. Review the content and click Analyze JSON.
                </p>
              )}

              {fileStatus.kind === 'error' && (
                <p
                  className="wi-file-status wi-file-status--error"
                  role="alert"
                >
                  {getSafeLocalJsonFileErrorText(fileStatus.code)}
                </p>
              )}
            </div>

            <div className="wi-actions">
              <button
                className="wi-submit"
                type="submit"
                disabled={fileStatus.kind === 'reading'}
              >
                Analyze JSON
              </button>

              <p className="wi-privacy">Processed locally. No file uploads.</p>
            </div>
          </form>

          {state.feedback.kind === 'empty' && (
            <p className="wi-message wi-message--error" role="alert">
              Paste a workflow JSON before analyzing.
            </p>
          )}

          {state.feedback.kind === 'audit' &&
            (state.feedback.result.success ? (
              <section
                className="wi-message wi-message--success"
                role="status"
                aria-live="polite"
                aria-label="Audit result"
              >
                <h3>Audit completed</h3>

                <div className="wi-metrics">
                  <div>
                    <span>Nodes analyzed</span>
                    <strong>{state.feedback.result.nodeCount}</strong>
                  </div>

                  <div>
                    <span>Findings detected</span>
                    <strong>{state.feedback.result.findings.length}</strong>
                  </div>
                </div>

                <p>
                  The audit is complete. A finding does not necessarily indicate
                  a runtime error.
                </p>
              </section>
            ) : (
              <section className="wi-message wi-message--error" role="alert">
                <h3>Audit could not be completed</h3>

                <p>{getSafeAuditErrorText(state.feedback.result.error.code)}</p>
              </section>
            ))}

          {state.feedback.kind === 'audit' && state.feedback.result.success && (
            <>
              <AuditReportDownload result={state.feedback.result} />

              <FindingList findings={state.feedback.result.findings} />
            </>
          )}
        </section>

        <footer className="wi-footer">
          Workflow Inspector analyzes JSON files statically and locally. It does
          not modify or execute workflows.
        </footer>
      </div>
    </main>
  )
}
