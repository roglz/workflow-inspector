# Stage 4 — Finding Severity Filters

## Purpose

Allow users to filter visible Workflow Inspector
findings by severity without changing audit results.

This is Step 4.5.

## Scope

Implemented:

- All-severity view
- Error-only view
- Warning-only view
- Information-only view
- Visible finding count
- Empty filtered-result message
- Accessible native select control
- Preservation of original finding order
- Stable original indices for rendered items

Not implemented:

- Sorting
- Grouping
- Search
- Confidence filters
- Pagination
- Export
- Workflow modification
- New audit rules

## Files

Filtering logic:

`src/ui/findings/finding-severity-filter.ts`

React integration:

`src/ui/findings/finding-list.tsx`

Styles:

`src/ui/findings/finding-severity-filter.css`

Tests:

`src/ui/findings/finding-severity-filter.test.tsx`

Documentation:

`src/ui/findings/finding-severity-filter.md`

## Input contract

Filtering uses existing Finding objects.

The supported filter values are:

- all
- error
- warning
- info

The source collection is a readonly array.

The filter does not change the Finding schema.

## Filtering function

Public helper:

`selectFindingsBySeverity(findings, severity)`

The helper returns a new array of objects containing:

- finding: original Finding reference
- originalIndex: original position in the source array

This preserves order and stable positional identity.

No findings are deleted or modified.

## Invalid filter values

The function:

`parseFindingSeverityFilter(value)`

accepts known severity values.

Unknown values become all.

Values are compared exactly.

## React state

FindingList owns the selected severity using
React useState.

The default filter is all.

The native select element uses value and onChange.

Changing the filter does not invoke auditWorkflowJson(),
parseWorkflowJson(), or runRules().

When the user edits the workflow JSON, the existing
form reducer removes the previous audit feedback.

FindingList is then unmounted.

A new audit after editing mounts FindingList with
the default all filter.

## Counts

The application summary continues to display:

`result.findings.length`

This is the total number of findings produced by
the audit engine.

The filtered list displays:

"Showing X of Y findings."

X is the number of visible findings.

Y is the original total.

Filtering does not modify Y.

## Empty states

If the audit has no findings, the existing message
remains visible:

"No findings were detected by the executed rules."

No severity selector is shown.

If an audit contains findings but none match the
selected filter, the interface displays:

"No findings match the current filters or search."

The original findings remain available when
the user selects another filter.

## Order and identity

The original findings order is preserved.

Each visible entry retains its original array index.

The React list key combines the rule ID and the
original position.

Repeated findings are not removed.

## Accessibility

The native select control has an associated label.

React useId creates an identifier for that association.

The filtered count uses role=status and aria-live=polite.

Each finding continues to display textual severity
information in addition to its existing color.

The component does not use dangerouslySetInnerHTML.

## Privacy

The filter operates exclusively on Finding objects.

It does not read the raw workflow JSON.

It does not access node parameters or credentials.

It does not use browser storage or network requests.

It does not execute n8n workflows or expressions.

## Limitations

Filtering changes only the visible list.

It does not change the audit result, severity,
confidence, or recommendations.

The existing graph-analysis limitations remain.

Some rules can omit analysis when connection data
is ambiguous or malformed.

An empty filtered list does not mean that the
workflow is free of problems.

This step does not implement additional criteria,
combined filters, or persistent filter preferences.

## Testing

Automated tests verify:

- Every filter value
- Unknown values
- Correct severity selection
- Empty source collections
- Filters without matching findings
- Original order
- Repeated references
- Input immutability
- Accessible initial select markup
- Correct initial totals
- Integration with actual R07 and R09 findings

Manual tests verify changing the native select
and the visual update of finding cards.

## Acceptance criteria

Step 4.5 can be closed when:

- All 22 new tests pass.
- All 345 previous tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Browser filter interactions work correctly.
- The audit engine, application facade, form reducer,
  file import, and App.tsx remain unchanged.
