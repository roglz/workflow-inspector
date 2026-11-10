# Workflow Inspector — Cross-Browser E2E

## Purpose

Validate Workflow Inspector behavior in Chromium,
Firefox, and WebKit using Playwright.

This is Stage 5, Step 5.3.

The step extends browser compatibility coverage
without changing the application implementation.

## Verified baseline

Before Step 5.3:

- 489 passing Vitest tests
- 28 Vitest test files
- 15 passing development E2E tests
- 17 passing production-build E2E tests
- Successful TypeScript and Vite build
- Oxlint without errors or warnings
- Prettier checks passing

## Scope

This step covers:

- Chromium desktop
- Firefox desktop
- WebKit desktop
- Shared functional E2E scenarios
- Repeated local file selection
- HTTP origin observation during audit and export

This step does not cover:

- Mobile browsers
- Real Apple Safari on macOS or iOS
- Branded Firefox releases
- Google Chrome or Microsoft Edge channels
- Every browser version
- Public production deployment
- Performance or load testing
- Comprehensive security auditing

## Files

Cross-browser configuration:

`playwright.cross-browser.config.ts`

Additional tests:

`e2e/browser-compatibility.cross.ts`

Existing shared tests:

`e2e/workflow-inspector.e2e.ts`

Documentation:

`e2e/CROSS_BROWSER.md`

## Browser installation

Chromium is already installed from Step 5.1.

Install Firefox and WebKit using:

```powershell
npm.cmd exec -- playwright install firefox webkit
```

Inspect installed browsers:

```powershell
npm.cmd exec -- playwright install --list
```

Playwright uses browser builds compatible with
the installed Playwright package.

WebKit on Windows is not equivalent to testing
the branded Safari browser on macOS.

## Test environment

The cross-browser configuration uses:

`http://127.0.0.1:5175`

Playwright starts the Vite development server.

It does not reuse an existing server on this port.

The server shuts down after the test run.

No production source files are modified.

## Test discovery

The cross-browser configuration includes:

- *.e2e.ts
- *.cross.ts

It excludes:

- *.prod.ts

The original development configuration still
discovers only *.e2e.ts.

The production configuration continues to
discover *.e2e.ts and *.prod.ts.

Vitest does not discover *.cross.ts as a test
file under the existing default naming rules.

## Browser projects

Three independent Playwright projects exist:

- chromium-cross
- firefox-cross
- webkit-cross

Each project executes the same 17 E2E cases.

Expected executions:

- Chromium: 17
- Firefox: 17
- WebKit: 17

Total expected cross-browser executions: 51.

## Shared functional coverage

The 15 existing E2E tests cover:

- Initial React form
- Empty submission
- Valid and invalid workflow JSON
- R07 and R09 findings
- Severity filtering
- Confidence filtering
- Search
- Rule grouping
- Local file import
- Invalid file rejection
- Export of complete findings
- Exclusion of raw node data
- State reset after editing

## Additional compatibility checks

### Repeated local file selection

Verifies that an imported JSON file can be
selected again after manual edits.

The second selection restores the file contents.

Selecting the file does not trigger the audit.

### Local HTTP requests

Observes HTTP and HTTPS requests during:

- Initial page loading
- JSON auditing
- Report download

The test asserts that observed requests use
the expected local origin.

This check is limited to its particular test
scenario and observed HTTP/HTTPS requests.

It does not guarantee the absence of all possible
external communication in all application states.

## Commands

List all cross-browser tests:

```powershell
npm.cmd exec -- playwright test --config=playwright.cross-browser.config.ts --list
```

Run all three browsers:

```powershell
npm.cmd exec -- playwright test --config=playwright.cross-browser.config.ts
```

Run only Firefox:

```powershell
npm.cmd exec -- playwright test --config=playwright.cross-browser.config.ts --project=firefox-cross
```

Run only WebKit:

```powershell
npm.cmd exec -- playwright test --config=playwright.cross-browser.config.ts --project=webkit-cross
```

Run development Chromium tests:

```powershell
npm.cmd exec -- playwright test
```

Run production Chromium tests:

```powershell
npm.cmd exec -- playwright test --config=playwright.production.config.ts
```

## Environment isolation

Development E2E uses port 5174.

Production E2E uses port 4174.

Cross-browser E2E uses port 5175.

The configurations have separate temporary
failure-artifact directories.

Cross-browser artifacts are stored in:

`node_modules/.cache/workflow-inspector-playwright-cross-browser`

## Reliability

The configuration uses two workers.

Automatic retries are disabled.

Playwright's locator assertions provide waiting
for expected browser state.

If a browser-specific test fails, its failure
must be investigated before closing the step.

Failing tests should not be skipped merely to
obtain a passing total.

## Privacy

All test workflows are synthetic.

File selections use in-memory buffers.

Report downloads use browser-managed temporary
download locations.

The tests do not require credentials or real
workflow documents.

No remote service is needed to run the suite.

## Limitations

The suite runs against Vite development mode.

The production-build suite from Step 5.2 remains
a separate Chromium verification.

Passing WebKit on Windows does not establish
full Safari compatibility on Apple devices.

Browser builds and operating-system dependencies
can influence compatibility.

Future changes to Playwright may require new
compatible browser binaries.

## Acceptance criteria

Step 5.3 can be closed when:

- Firefox and WebKit install successfully.
- Cross-browser test discovery reports 51 cases.
- All 51 cross-browser executions pass.
- The existing 15 development E2E tests pass.
- The existing 17 production E2E tests pass.
- All 489 Vitest tests pass.
- TypeScript and Vite build successfully.
- Oxlint reports zero warnings and errors.
- Prettier checks pass.
- No application source files are modified.
- No browser-specific test is disabled or skipped.
- The cross-browser test server shuts down
  after completing the suite.
