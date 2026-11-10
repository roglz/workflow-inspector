# Workflow Inspector — User Guide

## 1. What is Workflow Inspector?

Workflow Inspector is a browser-based tool for statically
analyzing n8n workflow JSON files.

It identifies certain structural issues and provides
recommendations to help users review them.

The analysis runs in the browser. Workflow Inspector
does not execute workflows or require a connection
to an n8n server.

## 2. Features

Workflow Inspector allows you to:

- Paste workflow JSON directly into the application.
- Import a local `.json` file.
- Run the ten static audit rules R01–R10.
- Review detected findings.
- Filter findings by severity.
- Filter findings by confidence.
- Search by text or rule ID.
- Group findings by rule.
- Export a JSON audit report.

The application does not modify the original file.

## 3. Opening the application

Open Workflow Inspector using the address provided
by the person hosting or running the application.

When running the development server locally,
the usual address is:

`http://localhost:5173/`

The actual address is displayed by Vite.

For local build instructions, see
[Local Installation](LOCAL_INSTALLATION.md).

You do not need to sign in to n8n.

## 4. Analyzing pasted workflow JSON

1. Open Workflow Inspector.
2. Locate the **Workflow JSON** input.
3. Paste the workflow JSON.
4. Select **Analyze JSON**.
5. Wait for the audit results.
6. Review the summary and findings.

The input must contain valid JSON with a structure
supported by the analyzer.

### Minimal example

You can test the application using:

```json
{
  "nodes": [],
  "connections": {}
}
```

This example contains no nodes.

It verifies that the application accepts a valid
minimal structure and can complete an audit.

## 5. Importing a local JSON file

1. Open Workflow Inspector.
2. Locate **Or select a JSON file**.
3. Select a local `.json` file.
4. Confirm that the file has loaded.
5. Select **Analyze JSON**.
6. Review the results.

Selecting a file does not automatically run an audit.

The local file importer accepts files up to 5 MiB.

An empty file, an unsupported file type, or a file
larger than the limit will be rejected.

The 5 MiB restriction applies to file import.
It is not a guaranteed processing limit for manually
pasted content.

## 6. Understanding audit results

A successful audit displays summary information and,
when issues are detected, a list of findings.

A finding can contain:

- Rule ID.
- Title.
- Severity.
- Confidence.
- Description.
- Recommendation.
- Node position, when available.

Findings are limited to conditions implemented
by the available rules.

### Severity

Severity describes the importance assigned
to a detected issue.

The internal severity values are:

- `error`
- `warning`
- `info`

A finding classified as an error does not necessarily
mean that the workflow has failed during execution.

### Confidence

Confidence describes the certainty assigned
to a finding by its rule.

The internal confidence values are:

- `high`
- `medium`
- `low`

Confidence is not a calculated probability
of runtime failure.

### No findings

An audit without findings means that the executed
rules did not detect the conditions they check.

It does not guarantee that the workflow is
correct, executable, or secure.

## 7. Available audit rules

Workflow Inspector implements ten static audit rules.

| Rule | Check                           |
| ---- | ------------------------------- |
| R01  | Duplicate node IDs              |
| R02  | Duplicate node names            |
| R03  | References to missing nodes     |
| R04  | Malformed connection structures |
| R05  | Isolated nodes                  |
| R06  | Disconnected node groups        |
| R07  | Cycles in main connections      |
| R08  | Duplicate connections           |
| R09  | Missing or blank node IDs       |
| R10  | Blank node names                |

Each rule operates according to its implemented
detection conditions.

The rules do not cover every possible problem
in an n8n workflow.

### Reviewing a finding

1. Identify the rule ID.
2. Read the finding description.
3. Review the referenced node or connection.
4. Check the corresponding workflow structure.
5. Make any correction in the tool where you
   maintain the original workflow.
6. Export the updated workflow JSON if necessary.
7. Run another audit.

Workflow Inspector does not automatically repair
or modify workflows.

## 8. Filtering and searching findings

Filters help narrow the visible findings.

You can:

- Select a severity.
- Select a confidence level.
- Combine severity and confidence filters.
- Search finding text.
- Search directly by rule ID.

Filtering changes the displayed results only.

It does not modify the complete audit result
or the exported report.

Reset the filters to view all findings again.

## 9. Grouping findings

The grouped view organizes findings by rule ID.

This is useful when several findings belong
to the same rule.

Grouping respects the currently selected
filters and search query.

Switching views does not run another audit.

## 10. Exporting a JSON report

After a successful audit, select:

**Export JSON report**

The browser downloads a file named:

`workflow-inspector-report.json`

The export contains the complete audit results,
including findings hidden by the current
display filters.

The report format uses its own version number.

### Report privacy

The report is designed to contain findings
and summary metadata, not a copy of the
original workflow JSON.

Automated tests verified that selected private
node values and parameters were excluded
from generated reports in the tested scenarios.

Review exported reports before sharing them.

## 11. Editing and analyzing again

You can edit the JSON and run another audit.

After the input changes, previous results no
longer correspond to the current content.

Select **Analyze JSON** again to generate
updated results.

When importing another version of a workflow,
confirm that the intended file content has loaded.

## 12. Troubleshooting

### Invalid JSON

The application displays an error when the input
cannot be parsed.

Check the following:

- Quotation marks.
- Commas and brackets.
- Complete JSON structure.
- Whether the entire workflow was copied.

### File import rejected

Verify that:

- The file has a `.json` extension.
- The file is not empty.
- The file does not exceed 5 MiB.
- The file can be read.

### No findings are displayed

The audit may have completed without detecting
issues covered by its rules.

This is not a guarantee that the workflow
will execute successfully.

### The report contains more findings than

the visible list

This is expected when filters are active.

The exported report includes all audit findings,
not only those currently visible.

## 13. Privacy and data handling

Workflow Inspector is designed to process
workflow JSON locally in the browser.

It does not require n8n credentials.

It does not execute nodes or connections.

Browser tests confirmed that selected audit
and export scenarios did not make external
HTTP requests.

These tests do not establish an absolute
security or privacy guarantee for every
environment or browser configuration.

Use synthetic workflows for testing whenever
possible and review reports before sharing.

## 14. Accessibility

The interface provides labeled controls
and supports keyboard interaction.

Automated accessibility tests cover
selected WCAG A/AA checks.

Keyboard navigation and assistive technology
should also be reviewed manually.

Passing automated tests does not constitute
formal WCAG certification.

The interface declares English as the
document language.

## 15. Limitations

Workflow Inspector does not:

- Execute n8n workflows.
- Validate credentials.
- Test external integrations.
- Predict every runtime error.
- Replace execution testing in n8n.
- Automatically repair workflows.
- Guarantee workflow security.
- Support every possible n8n structure
  or version.

It is a static structural analysis aid.

## 16. Additional documentation

- [Local installation](LOCAL_INSTALLATION.md)
- [Stage 5 technical validation](STAGE_5_VALIDATION.md)
- [Stage 6 release preparation](STAGE_6_RELEASE_PREPARATION.md)

Document filenames will be standardized
during the release documentation migration.
