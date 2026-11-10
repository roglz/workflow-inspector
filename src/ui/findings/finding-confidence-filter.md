# Stage 4 — Combined Severity and Confidence Filters

## Purpose

Extend the Workflow Inspector findings interface with
confidence filtering.

This is Step 4.6.

Users can combine confidence and severity selections
without modifying the original audit result.

## Scope

Implemented:

- All confidence levels
- High-confidence filter
- Medium-confidence filter
- Low-confidence filter
- Combination with existing severity filters
- Preservation of original finding positions
- Accessible native select control
- Shared visible-finding counter
- Empty combined-filter message

Not implemented:

- Sorting
- Grouping
- Search
- Pagination
- Export
- Persistent preferences
- New audit rules

## Files

Confidence filtering:

`src/ui/findings/finding-confidence-filter.ts`

React integration:

`src/ui/findings/finding-list.tsx`

Automated tests:

`src/ui/findings/finding-confidence-filter.test.tsx`

Documentation:

`src/ui/findings/finding-confidence-filter.md`

## Input contract

Confidence filtering uses the existing Finding model.

Supported values:

- all
- high
- medium
- low

The filtering function receives an array of
IndexedFinding objects from the severity filter.

Each entry includes:

- finding: the original Finding
- originalIndex: its original array position

No Finding model changes are required.

## Public helpers

### parseFindingConfidenceFilter

Accepts a string and returns a supported filter value.

Unknown values are converted to all.

Values are matched exactly.

### selectFindingsByConfidence

Signature:

```typescript
selectFindingsByConfidence(
  findings: readonly IndexedFinding[],
  confidence: FindingConfidenceFilter,
): IndexedFinding[]
```

Returns a new array without modifying the input.

Matching entries preserve their original references
and originalIndex values.

The relative order is unchanged.

## Combined filtering

The React component first calls:

`selectFindingsBySeverity()`

Then it calls:

`selectFindingsByConfidence()`

The combined condition uses logical AND.

A finding is visible only when it matches both
active criteria.

Selecting all for either criterion disables only
that criterion.

Neither helper modifies the original audit result.

## React state

FindingList owns two independent state values:

- severityFilter
- confidenceFilter

Both start at all.

Both controls are native select elements.

Changing a control updates the visible list.

It does not invoke:

- auditWorkflowJson()
- parseWorkflowJson()
- normalizeWorkflow()
- runRules()

Editing the workflow removes the previous audit
result through the existing form reducer.

This unmounts FindingList.

When a new result mounts, both filters start at all.

## Counts

The application summary retains the original total:

`result.findings.length`

The findings component displays:

"Showing X of Y findings."

X is the count after applying both filters.

Y is the unfiltered number of audit findings.

Neither filter changes Y.

## Empty states

When the audit has no findings, the component displays:

"No findings were detected by the executed rules."

Neither filter is rendered.

When there are original findings but the combined
selection has no matches, the component displays:

"No findings match the current filters or search."

This supersedes the severity-only empty-filter text
introduced in Step 4.5.

An empty visible list does not imply a clean workflow.

## Visual presentation

Severity labels remain:

- Error
- Warning
- Information

Confidence labels remain:

- High
- Medium
- Low

All other finding text is preserved from the
existing audit engine.

The existing filter CSS classes are reused.

No new CSS file is required.

## Accessibility

Each native select has an associated text label.

React useId provides distinct identifiers.

The visible result count uses role=status
and aria-live=polite.

Severity continues to be represented through
both text and color.

The interface does not use dangerouslySetInnerHTML.

## Privacy

Filtering operates only on Finding objects.

It does not access raw workflow JSON, node parameters,
credentials, or original file contents.

No network requests or browser storage are added.

The source audit result remains unchanged.

## Limitations

Filters affect only visibility.

They do not change finding severity, confidence,
titles, descriptions, or recommendations.

A filtered result count is not an assessment of
overall workflow safety.

The audit engine's existing graph-analysis limitations
remain unchanged.

The current interface renders matching findings in
a single list without pagination.

## Testing

Automated tests cover:

- Supported and unsupported confidence values
- High, medium, and low selection
- Empty collections
- Combined AND filtering
- Selection order and original indices
- Repeated finding references
- Immutability
- Accessible initial React markup
- Unfiltered initial count
- Real R07 and R09 findings

Native selector interactions are also verified
manually in the browser.

## Acceptance criteria

Step 4.6 can be closed when:

- All 25 new tests pass.
- All previous 367 tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Manual combined-filter scenarios pass.
- R01-R10, the audit facade, App.tsx, the form reducer,
  and local file import remain unchanged.
