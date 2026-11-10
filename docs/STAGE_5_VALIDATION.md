# Workflow Inspector — Stage 5

## Technical validation and quality closure

Status: Completed. All 11 verification checks passed.

## Purpose

Establish a reproducible quality baseline for
Workflow Inspector before preparing its first
stable delivery.

Stage 5 focuses on validating existing behavior.

It does not add audit rules or change the
R01–R10 engine.

## Completed milestones

### Step 5.1 — Browser E2E

Validated the application in Chromium using
the Vite development server.

Baseline: 15 passing tests.

### Step 5.2 — Production build E2E

Validated the compiled application using
Vite Preview and Chromium.

Baseline: 17 passing tests.

### Step 5.3 — Cross-browser development

Validated Chromium, Firefox, and WebKit.

Baseline: 51 passing executions.

### Step 5.4 — Cross-browser production

Validated the compiled application in Chromium,
Firefox, and WebKit.

Baseline: 51 passing executions.

### Step 5.5 — Accessibility

Added axe-core and keyboard accessibility tests.

Resolved:

- Incorrect HTML language declaration
- Footer text contrast

Baseline: 17 passing tests.

Manual keyboard, zoom, contrast and screen-reader
checks were confirmed.

Automated accessibility results do not constitute
full WCAG certification.

### Step 5.6 — Robustness and privacy

Validated:

- Local file size limits
- Empty file handling
- Invalid workflow structures
- Consecutive audits
- Unicode text
- Report data minimization
- HTTP requests in tested flows
- A synthetic workflow with 100 nodes

Baseline: 9 passing tests.

Observed 100-node E2E audit time: 134 ms.

This is one browser-level observation, not a
statistically reliable performance benchmark.

Manual robustness checks were confirmed.

## Final test reference

| Suite                     | Expected executions |
| ------------------------- | ------------------: |
| Vitest                    |                 489 |
| Development E2E           |                  15 |
| Production E2E            |                  17 |
| Cross-browser development |                  51 |
| Cross-browser production  |                  51 |
| Accessibility             |                  17 |
| Robustness                |                   9 |
| Total                     |                 649 |

The total includes repeated E2E scenarios
executed in different environments.

## Final verification

Use:

`scripts/verify-stage5.ps1`

The script executes:

1. Vitest
2. TypeScript and Vite build
3. Oxlint
4. Source formatting checks
5. Playwright and documentation formatting
6. Development E2E
7. Production E2E
8. Cross-browser development E2E
9. Cross-browser production E2E
10. Accessibility E2E
11. Robustness E2E

Each command must exit successfully.

The final displayed test counts are expected
reference values, not automatically parsed totals.

## Privacy model

Workflow Inspector is designed to operate locally.

The audit reads JSON without executing workflows.

Local file import uses the browser File API.

The report exports findings and summary metadata,
not the original workflow JSON.

Tests confirmed data minimization and absence of
external HTTP requests in selected scenarios.

This does not establish a mathematical guarantee
against every possible information disclosure.

Users should still avoid sharing private workflows
or generated reports with untrusted parties.

## Supported scope

Workflow Inspector is a static analyzer.

It supports the currently implemented audit
rules R01 through R10.

It does not execute n8n workflows.

It does not connect to n8n servers.

It does not verify runtime credentials,
external integrations, or execution results.

Its findings are limited to its implemented
static checks.

## Browser coverage

Automated checks use Playwright-managed:

- Chromium
- Firefox
- WebKit

WebKit on Windows is not equivalent to testing
Safari on a physical Apple device.

Not all browser versions or operating systems
are covered.

## Accessibility limitations

Automated checks cover selected WCAG 2.0 and
2.1 A/AA rules.

Manual verification supplements them.

Passing tests does not establish complete
WCAG conformance or formal certification.

## Performance limitations

The 100-node synthetic test is a basic smoke test.

No strict latency budget or load limit has been
established.

Performance with larger real-world workflows
may vary.

## Deployment limitations

Vite Preview validates compiled files locally.

It is not a production hosting solution.

Public hosting, HTTPS, deployment security
headers, versioning, and distribution belong
to a later stage.

## Final acceptance criteria

Stage 5 acceptance criteria:

- All verification commands pass.
- Actual suite totals match the baseline.
- No browser-specific test is skipped.
- No remaining critical issue is known
  within the defined test scope.
- Documentation matches verified behavior.
- Manual checks are accepted.
- The final report is reviewed.

After closure, the next milestone is
Stage 6 — Release preparation.
