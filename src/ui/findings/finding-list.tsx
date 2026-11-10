import { useId, useState } from 'react'

import type { Finding } from '../../core/models/finding'
import {
  parseFindingConfidenceFilter,
  selectFindingsByConfidence,
  type FindingConfidenceFilter,
} from './finding-confidence-filter'
import {
  groupFindingsByRule,
  parseFindingViewMode,
  type FindingViewMode,
} from './finding-rule-groups'
import { selectFindingsBySearch } from './finding-search'
import {
  parseFindingSeverityFilter,
  selectFindingsBySeverity,
  type FindingSeverityFilter,
  type IndexedFinding,
} from './finding-severity-filter'

import './finding-list.css'
import './finding-severity-filter.css'
import './finding-search.css'
import './finding-rule-groups.css'

const severityLabels: Record<Finding['severity'], string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
}

const confidenceLabels: Record<Finding['confidence'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

interface FindingListProps {
  findings: readonly Finding[]
}

interface FindingCardProps {
  item: IndexedFinding
}

function FindingCard({ item }: FindingCardProps) {
  const { finding } = item

  return (
    <li className={`wi-finding-card ` + `wi-finding-card--${finding.severity}`}>
      <div className="wi-finding-metadata">
        <span className="wi-finding-rule">{finding.ruleId}</span>

        <span
          className={
            `wi-finding-severity ` + `wi-finding-severity--${finding.severity}`
          }
        >
          {severityLabels[finding.severity]}
        </span>

        <span className="wi-finding-confidence">
          Confidence: {confidenceLabels[finding.confidence]}
        </span>

        {finding.nodeIndex !== undefined && (
          <span className="wi-finding-node">Node {finding.nodeIndex + 1}</span>
        )}
      </div>

      <h4>{finding.title}</h4>

      <p className="wi-finding-description">{finding.description}</p>

      <p className="wi-finding-recommendation">
        <strong>Recommendation:</strong> {finding.recommendation}
      </p>
    </li>
  )
}

export function FindingList({ findings }: FindingListProps) {
  const [severityFilter, setSeverityFilter] =
    useState<FindingSeverityFilter>('all')

  const [confidenceFilter, setConfidenceFilter] =
    useState<FindingConfidenceFilter>('all')

  const [searchQuery, setSearchQuery] = useState('')

  const [viewMode, setViewMode] = useState<FindingViewMode>('list')

  const severityFilterId = useId()
  const confidenceFilterId = useId()
  const searchId = useId()
  const searchHelpId = useId()
  const viewModeId = useId()
  const groupHeadingPrefix = useId()

  const severitySelected = selectFindingsBySeverity(findings, severityFilter)

  const confidenceSelected = selectFindingsByConfidence(
    severitySelected,
    confidenceFilter,
  )

  const visibleFindings = selectFindingsBySearch(
    confidenceSelected,
    searchQuery,
  )

  const ruleGroups = groupFindingsByRule(visibleFindings)

  return (
    <section className="wi-findings" aria-labelledby="wi-findings-title">
      <h3 id="wi-findings-title">Finding details</h3>

      {findings.length === 0 ? (
        <p className="wi-findings-empty">
          No findings were detected by the executed rules.
        </p>
      ) : (
        <>
          <div className="wi-finding-filter-controls">
            <div className="wi-finding-filter-field">
              <label
                className="wi-finding-filter-label"
                htmlFor={severityFilterId}
              >
                Filter by severity
              </label>

              <select
                id={severityFilterId}
                name="finding-severity-filter"
                className="wi-finding-filter-select"
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(
                    parseFindingSeverityFilter(event.currentTarget.value),
                  )
                }
              >
                <option value="all">All severities</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
                <option value="info">Information</option>
              </select>
            </div>

            <div className="wi-finding-filter-field">
              <label
                className="wi-finding-filter-label"
                htmlFor={confidenceFilterId}
              >
                Filter by confidence
              </label>

              <select
                id={confidenceFilterId}
                name="finding-confidence-filter"
                className="wi-finding-filter-select"
                value={confidenceFilter}
                onChange={(event) =>
                  setConfidenceFilter(
                    parseFindingConfidenceFilter(event.currentTarget.value),
                  )
                }
              >
                <option value="all">All confidence levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="wi-finding-filter-field wi-finding-search-field">
              <label className="wi-finding-filter-label" htmlFor={searchId}>
                Search findings
              </label>

              <input
                id={searchId}
                name="finding-search"
                className="wi-finding-search-input"
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="R09, title or recommendation"
                aria-describedby={searchHelpId}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />

              <p className="wi-finding-search-help" id={searchHelpId}>
                Search by rule, title, description, or recommendation.
              </p>
            </div>

            <div className="wi-finding-filter-field">
              <label className="wi-finding-filter-label" htmlFor={viewModeId}>
                Results view
              </label>

              <select
                id={viewModeId}
                name="finding-view-mode"
                className="wi-finding-filter-select"
                value={viewMode}
                onChange={(event) =>
                  setViewMode(parseFindingViewMode(event.currentTarget.value))
                }
              >
                <option value="list">List</option>
                <option value="grouped">Grouped by rule</option>
              </select>
            </div>

            <p
              className="wi-finding-filter-count"
              role="status"
              aria-live="polite"
            >
              Showing {visibleFindings.length} of {findings.length} findings.
            </p>
          </div>

          {visibleFindings.length === 0 ? (
            <p className="wi-findings-empty">
              No findings match the current filters or search.
            </p>
          ) : viewMode === 'list' ? (
            <ol className="wi-finding-list" role="list">
              {visibleFindings.map((item) => (
                <FindingCard
                  key={`${item.finding.ruleId}-${item.originalIndex}`}
                  item={item}
                />
              ))}
            </ol>
          ) : (
            <div className="wi-finding-groups">
              {ruleGroups.map((group) => {
                const headingId = `${groupHeadingPrefix}-${group.ruleId}`

                return (
                  <section
                    key={group.ruleId}
                    className="wi-finding-group"
                    aria-labelledby={headingId}
                  >
                    <h4 id={headingId} className="wi-finding-group-heading">
                      {group.ruleId} · {group.items.length}{' '}
                      {group.items.length === 1 ? 'finding' : 'findings'}
                    </h4>

                    <ol className="wi-finding-list" role="list">
                      {group.items.map((item) => (
                        <FindingCard
                          key={`${item.finding.ruleId}-${item.originalIndex}`}
                          item={item}
                        />
                      ))}
                    </ol>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
