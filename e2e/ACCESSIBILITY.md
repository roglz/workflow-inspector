# Workflow Inspector — Accessibility Verification

## Purpose

Evaluate accessibility of the Workflow Inspector
React interface.

This is Stage 5, Step 5.5.

The step combines automated accessibility rules,
keyboard interaction tests, and manual inspection.

## Verified baseline

Before accessibility testing:

- 489 passing Vitest tests
- 15 development E2E tests
- 17 production E2E tests
- 51 cross-browser development E2E executions
- 51 cross-browser production E2E executions

All automated suites passed.

## Tools

The step uses:

- Playwright Test
- @axe-core/playwright
- Chromium

The axe-core package is a development dependency.

No additional browser installation is required.

## Files

Playwright configuration:

`playwright.accessibility.config.ts`

Accessibility tests:

`e2e/workflow-accessibility.a11y.ts`

Documentation:

`e2e/ACCESSIBILITY.md`

## Environment

The suite uses:

`http://127.0.0.1:5176`

Playwright starts a separate Vite development server.

The server is stopped after testing.

The test file uses the .a11y.ts suffix to avoid
mixing accessibility tests with existing E2E suites.

## Automated WCAG scans

The test suite runs axe-core scans for these tags:

- wcag2a
- wcag2aa
- wcag21a
- wcag21aa

Scans run after the relevant UI state is visible.

States include:

1. Initial form
2. Successful empty audit
3. Invalid JSON feedback
4. Audit with findings and filters
5. Grouped findings

No axe rules are disabled.

No application regions are excluded.

Any detected violation must be investigated.

## Keyboard and semantics

Other tests verify:

- Main landmark
- Primary and secondary headings
- English document language
- Accessible JSON input labels
- Initial Tab navigation order
- Enter-key audit submission
- Keyboard severity selection
- Keyboard text search
- Empty-input error alert
- Parser error alert
- Live status regions and result counts
- Group section labels
- Enter-key report download

The expected suite contains 17 tests.

## Language

Workflow Inspector's principal UI language
is English.

The document should declare:

`<html lang="en">`

If the existing document declares another language,
the discrepancy must be reviewed before accepting
the accessibility step.

The language check may require a targeted correction
to index.html.

## Manual testing

Automated tools cannot detect every accessibility
problem.

Manual checks should cover:

1. Full keyboard navigation and visible focus
2. Form labels and understandable feedback
3. Zoom at 200% and 400%
4. Horizontal overflow and content clipping
5. Contrast and color-independent meaning
6. Screen-reader navigation and announcements

Use synthetic test workflows.

## Expected behavior

All interactive controls must be reachable with
the keyboard.

Buttons should activate using Enter or Space,
according to native browser behavior.

Visible focus must be distinguishable.

Error feedback must remain readable.

Filtering must not change the full audit count.

Grouping must preserve accessible headings.

The export action must not submit the audit form.

## Privacy

All test workflows use synthetic data.

No real credentials are required.

The axe-core script runs inside the local browser
test environment.

The accessibility tests do not add external
network requests to application code.

Screenshots and traces may contain test content.

They remain in local Playwright output directories.

## Limitations

Automated axe-core checks do not establish full
WCAG conformance.

Keyboard tests do not replace assistive technology
testing.

Chromium results do not guarantee identical
screen-reader behavior in other browsers.

Color contrast and zoom should also be inspected
manually.

This step does not implement a formal external
accessibility certification.

## Regression

The accessibility suite must not replace or disable
any existing tests.

Vitest, production build, lint, and formatting
checks must continue passing.

Previously approved Playwright configurations
must remain unchanged.

## Acceptance criteria

Step 5.5 can be closed when:

- The accessibility dependency installs.
- All 17 accessibility tests pass.
- Detected accessibility issues are resolved.
- All manual checks pass.
- All 489 Vitest tests continue passing.
- Existing Playwright suites remain valid.
- TypeScript and Vite compile successfully.
- Oxlint has no errors or warnings.
- Prettier checks pass.
- No audit rules or core contracts change.
- Any source changes needed for accessibility
  are explicitly verified and documented.

Do not declare accessibility certification
based solely on automated test results.
