# Stage 4 — Detailed Findings

## Purpose

Display individual Workflow Inspector audit findings
in the React application.

This is Step 4.3.

The component presents existing Finding objects.
It does not analyze workflow JSON.

## Scope

Implemented:

- Detailed findings list
- Rule ID labels
- Severity labels
- Confidence labels
- Finding titles
- Finding descriptions
- Recommendations
- One-based node positions
- Empty-result message
- Responsive visual presentation

Not implemented:

- Severity filters
- Sorting
- Grouping
- Search
- Pagination
- Report export
- Workflow editing
- Automatic repairs

## Files

Component:

`src/ui/findings/finding-list.tsx`

Styles:

`src/ui/findings/finding-list.css`

Tests:

`src/ui/findings/finding-list.test.tsx`

React integration:

`src/App.tsx`

## Input contract

The component accepts:

```typescript
interface FindingListProps {
  findings: readonly Finding[]
}
```

Finding objects come from the existing audit engine.

Their fields include:

- ruleId
- severity
- confidence
- title
- description
- recommendation
- optional nodeIndex

The component does not require the original JSON.

## Rendering rules

Findings are shown in their existing order.

Every finding becomes one list item.

Repeated findings are not removed.

Each item displays its rule ID, severity, confidence,
title, description, and recommendation.

If nodeIndex exists, its displayed position is
nodeIndex + 1.

If nodeIndex is absent, no node position is shown.

## Severity labels

| Internal value | Display     |
| -------------- | ----------- |
| error          | Error       |
| warning        | Warning     |
| info           | Information |

## Confidence labels

| Internal value | Display |
| -------------- | ------- |
| high           | High    |
| medium         | Medium  |
| low            | Low     |

The original rule messages are preserved.

Severity and confidence labels are displayed in English.

## Empty results

When findings is an empty array, the component displays:

"No findings were detected by the executed rules."

The component is mounted only after a successful audit.

This wording does not claim that a workflow is safe
or that all graph analyses were necessarily performed.

## Accessibility

The component uses a labelled section and
an ordered list.

Severity is communicated through text as well as color.

The detailed list is outside the live status region
used for the audit summary.

## Security and privacy

The component uses ordinary JSX text rendering.

It does not use dangerouslySetInnerHTML.

It does not request or display the raw workflow JSON.

It does not use network requests or browser storage.

The existing audit engine is responsible for keeping
original node names, identifiers, parameters, and
credentials out of finding messages.

## State integration

The component receives findings from:

`auditWorkflowJson()`

The existing form reducer clears previous feedback
when the input changes.

Therefore, the detailed list also disappears
after the user edits the JSON.

No reducer changes are required.

## Limitations

This component does not:

- Verify whether a finding is correct
- Execute workflows
- Translate original rule descriptions
- Distinguish graph analysis skipped from no findings
- Generate reports
- Repair workflows
- Add or remove findings

The list currently renders all findings.

Large result sets may require pagination or
virtualization in a later step.

## Testing

Automated tests cover:

- Empty results
- All finding fields
- Severity and confidence variants
- Node positions
- Original order
- Repeated findings
- HTML escaping
- Immutability
- Real R09, R02, and R10 results
- Initial application state

Manual testing must also verify the appearance
of results after submitting the form.

## Acceptance criteria

Step 4.3 can be closed when:

- All 19 new tests pass.
- All previous tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Browser tests confirm the detailed results.
- The core audit engine and form reducer remain unchanged.
