# Workflow Inspector — Release Preparation

## Stage 6

Status: In progress.

Technical validation and the initial release inventory
have been completed.

English-language documentation and release preparation
are still in progress.

## Purpose

Prepare the first stable release of Workflow Inspector
using the application validated during the previous stages.

Release preparation must not introduce new functionality
or modify the R01–R10 audit engine.

## Approved technical baseline

Stage 5 concluded with:

- 489 passing Vitest tests.
- 15 development E2E executions.
- 17 production E2E executions.
- 51 cross-browser development E2E executions.
- 51 cross-browser production E2E executions.
- 17 accessibility E2E executions.
- 9 robustness E2E executions.

Total: 649 automated test executions.

This total includes scenarios repeated across different
browsers and environments.

The consolidated verification script successfully
completed all 11 checks.

## Existing functionality

Workflow Inspector supports:

- Manual workflow JSON input.
- Local JSON file import.
- Static analysis using rules R01–R10.
- Findings with severity and confidence levels.
- Filtering and searching findings.
- Grouping findings by rule.
- Exporting a JSON audit report.

## Privacy

The application is designed to process workflow JSON
locally in the browser.

It does not execute workflows.

It does not require n8n credentials.

Automated tests confirmed the absence of external
HTTP requests in the specific audit and export
scenarios they observed.

Exported reports omit the original workflow JSON
and selected private node values covered by
the privacy tests.

These checks do not establish an absolute
security or privacy guarantee.

Users should review reports before sharing them.

## First release scope

The first stable release should include:

- An identifiable application version.
- Compiled static assets.
- User documentation.
- Installation or distribution instructions.
- A description of the available audit rules.
- Known limitations.
- A reproducible verification procedure.
- An explicit licensing decision.

The application does not require an n8n server
or an integration with external services.

## Technical inventory

The inventory script is:

`scripts/release-preflight.ps1`

It checks:

- Required project files.
- Package metadata.
- Existing npm scripts.
- Compiled assets under `dist/`.
- Available documentation.
- Git exclusions.
- Repository availability.

The initial inventory completed successfully.

The script does not assign a version,
publish packages, or create Git tags.

## Versioning

The current development version is:

`0.0.0`

The npm package is marked as private.

The final release version must be selected
explicitly during the versioning step.

A version must not be changed merely
to obtain a favorable test result.

If Git is used, any release tag should
correspond to the validated project state.

## Licensing

No project license has been selected yet.

Redistribution permissions must be
established explicitly.

Source code availability does not automatically
grant an open-source license.

Third-party dependency licenses must also
be respected when distributing the application.

The bundled n8n reference fixture and its
associated attribution and license files
must retain their applicable notices.

## Distribution

The existing build produces static assets
under the `dist/` directory.

Vite Preview supports local verification.
It is not a public production server.

The final distribution method must be
defined before packaging.

This preparation stage does not require
publishing the project to an external service.

## Quality verification

The consolidated verification script is:

`scripts/verify-stage5.ps1`

It performs 11 checks covering:

1. Vitest.
2. TypeScript and Vite production build.
3. Oxlint.
4. Source formatting.
5. Playwright and documentation formatting.
6. Development E2E.
7. Production E2E.
8. Cross-browser development E2E.
9. Cross-browser production E2E.
10. Accessibility E2E.
11. Robustness E2E.

All checks passed after the initial
documentation file renaming.

The final release will require another
complete verification after all planned
changes have been applied.

## Release preparation milestones

### Step 6.1 — Technical inventory

Completed.

Required files, compilation output,
package metadata, documentation,
and release prerequisites were reviewed.

### Step 6.2 — Documentation and localization

In progress.

The application interface has been
translated into English.

Documentation translation and consistency
checks are being completed.

### Step 6.3 — Version and license

Pending.

### Step 6.4 — Distribution package

Pending.

### Step 6.5 — Final acceptance

Pending.

## Acceptance criteria

Release preparation will be complete when:

- All package-facing content is in English,
  except intentional test fixtures and
  third-party material that must be preserved.
- Documentation links and script references work.
- The final version and licensing policy are approved.
- The distribution package is generated and inspected.
- All automated verification checks pass.
- Manual acceptance checks are completed.
- Known limitations are accurately documented.

No release should be declared complete
before these criteria have been verified.
