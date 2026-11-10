# Workflow Inspector

A privacy-focused, browser-based static analyzer for n8n workflow JSON files.

Workflow Inspector examines workflow structure using ten deterministic audit
rules and generates a report of the findings.

The application is built with React, TypeScript, and Vite.

## Features

- Paste workflow JSON directly into the application.
- Import local `.json` files up to 5 MiB.
- Run ten static audit rules (R01–R10).
- Review findings with severity and confidence levels.
- Filter findings by severity and confidence.
- Search findings by text or rule ID.
- Group findings by rule.
- Export a JSON report containing the complete audit results.

Workflow Inspector does not execute workflows or modify their original files.

## Quick start

Install the project dependencies:

```powershell
npm.cmd ci
```

Start the development server:

```powershell
npm.cmd run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173/`

No n8n server or n8n credentials are required.

## Your first audit

Open Workflow Inspector and paste this example into the **Workflow JSON**
field:

```json
{
  "nodes": [],
  "connections": {}
}
```

Select **Analyze JSON**.

The application should complete the audit and display a node count of zero.

Alternatively, select a local `.json` file and then choose **Analyze JSON**.

Importing a file does not automatically start an audit.

## Audit rules

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

Findings describe conditions detected by these specific rules.

An audit with no findings does not guarantee that a workflow is executable,
correct, or secure.

## Results and reports

Findings can be filtered by severity and confidence, searched, and grouped
by rule ID.

The **Export JSON report** button downloads:

`workflow-inspector-report.json`

The report includes the complete audit results, even when visual filters
are active.

The report format is versioned independently of the application.

## Production build

Generate the compiled static application:

```powershell
npm.cmd run build
```

The output is written to:

`dist/`

Check the compiled application locally:

```powershell
npm.cmd exec -- vite preview --host 127.0.0.1 --port 4180 --strictPort
```

Open:

`http://127.0.0.1:4180/`

Vite Preview is intended for local verification, not public production
hosting.

The final distribution process will be defined during release preparation.

## Development and testing

Run the unit and integration tests:

```powershell
npm.cmd run test
```

Run linting and source formatting checks:

```powershell
npm.cmd run lint
npm.cmd run format:check
```

Run the complete Stage 5 verification:

```powershell
powershell.exe -NoProfile -File .\scripts\verify-stage5.ps1
```

The Stage 5 verification requires development dependencies and compatible
Playwright browser installations.

The approved Stage 5 reference contains:

| Suite                         | Executions |
| ----------------------------- | ---------: |
| Vitest                        |        489 |
| Development E2E               |         15 |
| Production E2E                |         17 |
| Cross-browser development E2E |         51 |
| Cross-browser production E2E  |         51 |
| Accessibility E2E             |         17 |
| Robustness E2E                |          9 |
| **Total**                     |    **649** |

The total includes repeated scenarios across different browser engines
and environments.

## Privacy

Workflow Inspector is designed to analyze workflow JSON locally in the
browser.

It does not require n8n credentials or execute workflows.

Automated tests verified that selected audit and export scenarios did not
make external HTTP requests.

The exported report is designed to contain findings and summary metadata,
rather than a copy of the original workflow JSON.

These tests do not establish an absolute security or privacy guarantee.

Review generated reports before sharing them.

## Limitations

Workflow Inspector does not:

- Execute n8n workflows.
- Validate credentials or external integrations.
- Verify runtime behavior.
- Repair workflows automatically.
- Detect every possible configuration problem.
- Guarantee workflow security or successful execution.

It is a static analysis aid, not a substitute for testing workflows in n8n.

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Local installation](docs/LOCAL_INSTALLATION.md)
- [Stage 5 technical validation](docs/STAGE_5_VALIDATION.md)
- [Stage 6 release preparation](docs/STAGE_6_RELEASE_PREPARATION.md)

The documentation filenames will be standardized in English before release.

## Project status

Workflow Inspector is being prepared for its initial public Core release.

The current Core version is `0.1.0`, and the npm package is marked
as private.

The Core version and Apache License 2.0 are approved. Public repository publication and distribution details remain pending.

Workflow Inspector Core may be used, modified, and redistributed under Apache License 2.0, subject to its terms.

## Open Core Model

Workflow Inspector Core is free and open source under the
Apache License 2.0. It includes all ten existing audit rules,
local workflow analysis, findings exploration, and basic
JSON report export.

Workflow Inspector Pro is a planned proprietary edition
focused on batch analysis, workflow comparisons, advanced
reports, custom rules, and productivity features.

See the [Open Core Policy](docs/OPEN_CORE_POLICY.md)
for the complete scope and licensing boundaries.
