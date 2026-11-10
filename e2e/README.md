# Workflow Inspector — Browser E2E Tests

## Purpose

Validate the complete Workflow Inspector interface
using a real Chromium browser.

This is Stage 5, Step 5.1.

The E2E tests supplement the existing Vitest suite.
They do not replace unit or integration tests.

## Technology

The E2E suite uses Playwright Test.

It starts a local Vite development server and
controls Chromium automatically.

No production application files are modified.

## Files

Configuration:

`playwright.config.ts`

Test suite:

`e2e/workflow-inspector.e2e.ts`

Documentation:

`e2e/README.md`

## Installation

Run in Windows PowerShell:

```powershell
npm.cmd install --save-dev @playwright/test
npm.cmd exec -- playwright install chromium
```

The package installation updates package.json
and package-lock.json.

The browser installation downloads the compatible
Chromium binaries.

## Test server

Playwright uses:

`http://127.0.0.1:5174`

This is separate from the standard development
server at localhost:5173.

The runner starts and stops its own Vite server.

An existing process occupying port 5174 will
cause an explicit error.

## Running tests

List discovered E2E tests:

```powershell
npm.cmd exec -- playwright test --list
```

Run the complete E2E suite:

```powershell
npm.cmd exec -- playwright test
```

The expected suite contains 15 tests.

## Existing Vitest tests

Run the original tests separately:

```powershell
npm.cmd run test
```

The verified Stage 4 baseline is:

- 489 Vitest tests
- 28 Vitest test files

The new Playwright suite is not included in
that count.

## Browser scenarios

The E2E suite verifies:

1. Initial application state
2. Empty input validation
3. Valid empty workflow auditing
4. Malformed JSON handling
5. Real R07 and R09 rendering
6. Severity filtering
7. Combined severity/confidence filtering
8. Local finding search
9. Grouping and search
10. Valid local JSON import
11. Invalid filename rejection
12. Invalid JSON import and audit separation
13. Complete report export despite filters
14. Raw data exclusion from report export
15. State clearing and reset after editing

## Fixtures

Tests use synthetic n8n-style workflows.

No real credentials or private workflows are needed.

Local file selections use in-memory buffers.

The exported report is inspected through
Playwright's temporary download directory.

Downloaded test files are cleaned up when
their browser contexts close.

## Diagnostics

Playwright saves failure screenshots and traces
under:

`node_modules/.cache/workflow-inspector-playwright`

This folder is intended for local test artifacts.

Failure artifacts can contain test input and
rendered output.

Only synthetic test data should be used.

## Scope and limitations

The first E2E suite covers Chromium only.

It does not yet test Firefox or WebKit.

It runs against a Vite development server,
not a production preview build.

It does not measure application performance.

It does not verify every possible n8n workflow.

It does not prove the absence of all security
or privacy vulnerabilities.

The existing core and UI tests remain necessary.

## Acceptance criteria

Step 5.1 can be closed when:

- Playwright and Chromium install successfully.
- All 15 E2E tests pass.
- All previous 489 Vitest tests pass.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier validates new and existing code.
- No application source files were modified.
- The E2E runner stops its test server properly.
