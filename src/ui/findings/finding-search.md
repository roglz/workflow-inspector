# Stage 4 — Local Finding Search

## Purpose

Add local text search to the Workflow Inspector
findings interface.

This is Step 4.7.

Search operates only on existing Finding objects.

## Scope

Implemented:

- Search by rule ID
- Search by finding title
- Search by finding description
- Search by recommendation
- Case-insensitive matching
- Accent-insensitive matching
- Partial text matching
- Combined search and filters
- Preservation of original finding order
- Updated visible finding counts
- Accessible native search input

Not implemented:

- Search inside raw workflow JSON
- Search inside node parameters
- Regular expressions
- Search operators
- Match highlighting
- Sorting
- Grouping
- Pagination
- Export

## Files

Search helper:

`src/ui/findings/finding-search.ts`

React component:

`src/ui/findings/finding-list.tsx`

Styles:

`src/ui/findings/finding-search.css`

Tests:

`src/ui/findings/finding-search.test.tsx`

Documentation:

`src/ui/findings/finding-search.md`

## Search function

Public helper:

```typescript
selectFindingsBySearch(
  findings: readonly IndexedFinding[],
  query: string,
): IndexedFinding[]
```

The function returns a new array.

It preserves original object references, originalIndex
values, and relative order.

It does not modify the input.

## Searchable fields

Search considers:

- ruleId
- title
- description
- recommendation

It does not inspect the raw workflow JSON.

It does not inspect node IDs, names, parameters,
credentials, or connection definitions.

Confidence and severity are controlled by their
existing dedicated filters.

Node positions are displayed but are not searched.

## Normalization

Both the query and searchable text are normalized.

Normalization:

1. Trims leading and trailing whitespace.
2. Applies Unicode NFD decomposition.
3. Removes combining marks in the supported range.
4. Converts letters to lowercase.

The resulting strings are compared using substring
matching.

An empty or whitespace-only query matches all
entries already selected by other filters.

## Combined selection

The component applies three steps:

1. selectFindingsBySeverity()
2. selectFindingsByConfidence()
3. selectFindingsBySearch()

All three criteria use logical AND.

Each stage receives the previous stage's results.

The original audit findings remain unchanged.

## React integration

FindingList owns local searchQuery state.

Its initial value is an empty string.

A controlled input with type=search updates
the state using onChange.

Typing changes the visible findings immediately.

The search does not call auditWorkflowJson().

## Results and counts

The application summary continues showing the total
number of audit findings.

The list displays:

"Showing X of Y findings."

X represents the number remaining after all three
selection criteria.

Y represents the original total.

Search does not change Y.

## Empty states

When the audit has no findings, the existing
empty-audit message remains visible.

No search input or filters are shown.

When a search or filter produces zero visible
findings, the component displays:

"No findings match the current filters or search."

This does not mean that the workflow has no problems.

## Editing and reset behavior

The existing form reducer clears previous audit
feedback when the workflow JSON is edited.

FindingList then unmounts.

A new audit mounts the component with:

- Severity: all
- Confidence: all
- Search: empty

No persistent search preferences are introduced.

## Privacy and security

Only Finding objects are searched.

The component does not read the original workflow
JSON or node parameters.

No network APIs or browser storage are added.

Finding text is rendered through ordinary JSX.

The application does not use dangerouslySetInnerHTML.

No query or finding text is transmitted externally
by this feature.

## Accessibility

The search input has a visible label.

Instructions are associated with aria-describedby.

The component uses the native input type=search.

The existing visible-count region announces changes
using role=status and aria-live=polite.

## Limitations

Search uses substring matching.

It does not support fuzzy matching, stemming,
word operators, or regular expressions.

Unicode normalization improves accented Latin-text
matching but does not guarantee identical matching
for all languages and writing systems.

The filtering occurs synchronously in the browser.

Large numbers of findings may affect rendering
performance.

Search does not change audit severity, confidence,
recommendations, or findings.

## Testing

Automated tests cover:

- Empty and whitespace-only queries
- Rule IDs and partial matches
- Title, description, and recommendation
- Case and accent normalization
- No-match behavior
- Preservation of order
- Duplicate findings
- Input immutability
- Combined severity and confidence filtering
- Accessible initial React markup
- Real R07 and R09 findings

Manual testing verifies typing, selection changes,
reset behavior, and existing file import.

## Acceptance criteria

Step 4.7 can be closed when:

- All 28 new tests pass.
- All previous 392 tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Manual search scenarios pass.
- The audit engine, application facade, App.tsx,
  form reducer, local file import, and existing
  severity and confidence helpers remain unchanged.
