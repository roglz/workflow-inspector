# Stage 4 — Finding Groups by Rule

## Purpose

Allow Workflow Inspector users to switch between
a flat findings list and a grouped view by rule ID.

This is Step 4.8.

Grouping changes presentation only.

It does not modify audit results.

## Scope

Implemented:

- Flat list view
- Grouped-by-rule view
- View-mode selector
- Group headings and visible counts
- Preservation of original finding indices
- Preservation of relative order within groups
- Compatibility with severity filtering
- Compatibility with confidence filtering
- Compatibility with local finding search
- Responsive group styling

Not implemented:

- Sorting by severity or confidence
- Collapsible groups
- Drag-and-drop reordering
- Pagination
- Report export
- Workflow editing
- Automatic workflow repair
- New audit rules

## Files

Grouping helper:

`src/ui/findings/finding-rule-groups.ts`

React integration:

`src/ui/findings/finding-list.tsx`

Styles:

`src/ui/findings/finding-rule-groups.css`

Tests:

`src/ui/findings/finding-rule-groups.test.tsx`

Documentation:

`src/ui/findings/finding-rule-groups.md`

## View modes

Supported values:

- list
- grouped

The default view is list.

The function parseFindingViewMode() accepts these values.

Unknown values return list.

## Grouping helper

Public function:

```typescript
groupFindingsByRule(
  findings: readonly IndexedFinding[],
): FindingRuleGroup[]
```

The input contains already selected findings.

Each IndexedFinding contains:

- finding: original Finding object
- originalIndex: original array position

The output contains groups:

```typescript
interface FindingRuleGroup {
  readonly ruleId: Finding['ruleId']
  readonly items: readonly IndexedFinding[]
}
```

Each group contains entries sharing the same ruleId.

## Group order

The implementation uses a Map.

Groups follow the order in which their rule IDs
first appear in the input.

No alphabetical or numeric sorting is performed.

Within a group, findings preserve their relative order.

Grouping can change the global presentation order
because entries with the same rule are shown together.

Their originalIndex values remain unchanged.

Repeated findings remain separate entries.

## Combined filtering

FindingList applies the existing helpers in order:

1. selectFindingsBySeverity()
2. selectFindingsByConfidence()
3. selectFindingsBySearch()

The resulting visible findings are passed to:

4. groupFindingsByRule()

The grouping helper receives only the findings
remaining after all filters.

Group counts therefore represent visible findings.

The original audit total remains unchanged.

## React integration

FindingList stores viewMode using React useState.

The initial value is list.

A native select control lets the user choose
the list or grouped presentation.

The selector does not run another audit.

A private FindingCard component renders the same
finding fields in both modes.

In list mode, all visible findings appear in one list.

In grouped mode, each visible rule has a labelled
section containing its own ordered findings list.

## Counts

The application summary continues displaying
the unfiltered audit finding count.

The filter panel continues displaying:

"Showing X of Y findings."

X is the number of visible findings after filtering.

Y is the original number of audit findings.

Changing the view mode does not change X or Y.

Group headings display the number of visible findings
belonging to each rule.

## Empty states

If an audit has no findings, the original empty-state
message is displayed.

No filters or view selector are rendered.

If filtering produces zero visible findings,
the existing filter/search empty-state message
is displayed.

No empty rule groups are created.

## Reset behavior

Editing workflow JSON clears the previous audit
feedback using the existing form reducer.

This unmounts FindingList.

After a new audit, FindingList mounts again
with viewMode set to list.

Severity, confidence, and search also return
to their existing defaults.

## Accessibility

The view selector has a visible associated label.

React useId generates the selector identifier
and group-heading identifier prefix.

Each grouped section is labelled by its heading.

Each group contains a semantic ordered list.

Severity is communicated through text and color.

The detailed findings remain outside the live
audit-summary status region.

## Privacy

Grouping operates only on Finding objects.

It does not read original workflow JSON,
node parameters, credentials, or imported files.

It does not use network APIs or browser storage.

The existing finding messages remain unchanged.

HTML is rendered through ordinary React JSX.

No dangerouslySetInnerHTML is introduced.

## Limitations

The grouping is by rule ID only.

It does not support grouping by node, severity,
confidence, or connected component.

Groups cannot be collapsed in this step.

The grouped view renders every matching finding.

Large result sets may eventually require pagination
or virtualized rendering.

Grouping does not resolve existing graph-analysis
limitations or indicate whether a rule was skipped.

## Testing

Automated tests cover:

- View-mode parsing
- Empty grouping
- Single and multiple groups
- First-appearance ordering
- Group counts
- Original indices
- Relative order
- Repeated entries
- Input immutability
- Compatibility with all three selection criteria
- Actual R02 and R10 results
- Accessible initial React markup
- Preservation of the flat default view

Manual browser tests verify the mode switch,
group rendering, filtering, reset behavior,
and accessibility.

## Acceptance criteria

Step 4.8 can be closed when:

- All 24 new tests pass.
- All previous 420 tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Manual browser scenarios pass.
- R01-R10, the audit facade, App.tsx, the form reducer,
  file import, and filtering helpers remain unchanged.
