# Workflow Inspector — Stage 4

## Status

Completed.

This stage integrated the existing static audit engine
with the local React application.

The final integration and regression checks were
validated during the previous development stages.

## Purpose

Integrate the n8n workflow static audit engine
with a browser-based React application.

The application does not execute analyzed workflows.

## Integrated functionality

### 4.1 — Audit facade

Application entry point:

`auditWorkflowJson(raw: string)`

Responsibilities:

- Parse JSON input.
- Normalize the workflow.
- Execute the available audit rules.
- Return controlled errors or audit findings.

### 4.2 — Manual input

Users can paste or edit workflow JSON in a text area.

An explicit button starts the audit.

Editing the input clears previous audit results.

### 4.3 — Detailed findings

Each finding can display:

- Rule ID.
- Severity.
- Confidence.
- Title.
- Description.
- Recommendation.
- Node position, when available.

### 4.4 — Local file import

Users can select local `.json` files.

The browser reads their content using `File.text()`.

The file import limit is 5 MiB.

The file is read before an audit can be performed.

Selecting a file does not automatically execute
the audit rules.

### 4.5 — Severity filtering

Available options:

- All severities.
- Error.
- Warning.
- Information.

Filtering affects only the presentation.

### 4.6 — Confidence filtering

Available options:

- All confidence levels.
- High.
- Medium.
- Low.

Confidence filtering can be combined with
severity filtering using AND logic.

### 4.7 — Local search

The application searches for partial matches in:

- `ruleId`
- `title`
- `description`
- `recommendation`

Search is case-insensitive and ignores supported
accent differences.

Search does not inspect the original workflow JSON.

### 4.8 — Grouping by rule

Two presentation modes are available:

- List.
- Grouped by rule.

Groups are generated after filtering and searching.

Grouping does not modify the original findings.

### 4.9 — JSON report export

Users can download a local, versioned audit report.

The report contains:

- `formatVersion`
- `nodeCount`
- `findingCount`
- `findings`

Visual filters do not restrict the exported results.

The original workflow JSON is not copied
directly into the report.

### 4.10 — Integration validation

The final integration step verifies:

- Local import.
- Auditing.
- Filtering.
- Searching.
- Grouping.
- Exporting.

It does not introduce new product functionality.

## Architecture

The application has four main layers:

1. Parser and normalizer.
2. Audit rule engine, R01–R10.
3. `auditWorkflowJson()` facade.
4. React interface.

The presentation layer does not implement
audit rules.

Filters receive previously generated findings.

The export layer receives the complete audit
result, not the filtered presentation list.

## Privacy

The features implemented during this stage
do not require a remote service to analyze workflows.

File import uses browser APIs.

Auditing, filtering, and searching operate locally.

The report exporter explicitly selects
the fields included in the output.

These features do not introduce persistent
browser storage or application network integrations.

Downloaded reports are saved to the user's device
according to browser settings. Once downloaded,
they are no longer exclusively held in memory.

The privacy of exported findings also depends
on audit rules avoiding sensitive input values
in titles, descriptions, and recommendations.

## Guarantees and limitations

Workflow Inspector performs static analysis.

It does not:

- Execute n8n workflows.
- Validate real credentials.
- Connect to external services.
- Verify runtime execution behavior.
- Guarantee that a workflow is error-free.

An audit without findings only means that
the executed rules did not detect their
defined conditions in the evaluated input.

Graph-analysis rules retain their limitations
when processing ambiguous or malformed structures.

The 5 MiB limit applies to files selected
through the importer. It is not a general
processing guarantee for manually pasted text.

## Preserved contracts

Stage 4 preserves:

- R01–R10.
- `Finding`.
- The parser.
- The normalizer.
- `runRules()`.
- `auditWorkflowJson()`.

React components consume these existing contracts.

## Automated verification

The verified baseline after Step 4.9 was:

- 471 passing tests.
- 27 test files.
- Successful production build.
- Oxlint without errors or warnings.
- Passing Prettier checks.

Step 4.10 added 18 integration tests.

The completed Stage 4 reference was:

- 489 passing tests.
- 28 test files.

Subsequent Stage 5 validation retained
the same Vitest baseline and added browser,
accessibility, and robustness verification.

## Verification commands

From the project root in Windows PowerShell:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run lint
npm.cmd run format:check
npm.cmd exec -- prettier --check src/ui/STAGE_4.md
```

## Manual acceptance checklist

The manual checks cover:

1. Valid and invalid JSON input.
2. Local JSON file import.
3. Detailed finding presentation.
4. Combined severity and confidence filters.
5. Search by rule ID and description.
6. Grouping by rule.
7. Complete report export with active filters.
8. Clearing previous results after input changes.

## Completion criteria

Stage 4 acceptance requires:

- All 18 integration tests passing.
- Complete Vitest regression passing.
- Successful production build.
- Oxlint and Prettier checks passing.
- Manual integration scenarios behaving as expected.
- Core audit contracts remaining unchanged.
- No known blocking issues within the defined scope.

Acceptance must be supported by actual
verification results rather than expected
test totals alone.

## Related documentation

- [Stage 3 rule-engine audit](../core/rules/stage-3-audit.md)
- [Stage 5 validation](../../docs/STAGE_5_VALIDATION.md)
