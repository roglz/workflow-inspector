# Workflow Inspector — Robustness, Privacy and Performance

## Purpose

Validate the robustness of the compiled Workflow
Inspector application using synthetic test inputs.

This is Stage 5, Step 5.6.

The step adds browser tests without changing the
audit engine or existing application functionality.

## Verified baseline

Before Step 5.6:

- 489 passing Vitest tests
- 17 passing accessibility tests
- 15 development Chromium E2E tests
- 17 production Chromium E2E tests
- 51 cross-browser development E2E executions
- 51 cross-browser production E2E executions
- Successful TypeScript and Vite build
- Oxlint and Prettier checks passing

## Files

Configuration:

`playwright.robustness.config.ts`

Tests:

`e2e/workflow-robustness.robust.ts`

Documentation:

`e2e/ROBUSTNESS.md`

## Environment

The suite runs in Chromium against the compiled
application served by Vite Preview.

Local address:

`http://127.0.0.1:4176`

Playwright builds the application before starting
the preview server.

No public deployment is performed.

## Robustness tests

The suite verifies:

1. Rejection of JSON files larger than 5 MiB
2. Acceptance of a file exactly 5 MiB in size
3. Rejection of empty local JSON files
4. Rejection of an invalid workflow structure
5. Replacement of results after repeated audits
6. Acceptance of Unicode node names
7. Exclusion of private workflow data in reports
8. HTTP origin and request-method observation
9. A synthetic audit with 100 disconnected nodes

The file-size limit applies to local file imports,
not necessarily to manually pasted text.

Large test files are generated in memory.

No real workflows are used.

## Privacy checks

The report test uses a synthetic secret marker.

It verifies that the exported report omits:

- The original private node name
- Raw parameters
- The synthetic authorization field

The network test observes HTTP/HTTPS requests
during a successful audit and report download.

It rejects observed requests to foreign origins
and HTTP methods other than GET.

These checks are limited to the tested scenarios
and request types.

They do not establish complete network isolation
under every possible condition.

## Performance measurement

The performance test creates a synthetic workflow
containing 100 disconnected nodes.

It reports a value such as:

`ROBUSTNESS_AUDIT_100_NODES_MS=120`

This number is an example, not an expected result.

The measurement includes browser interaction and
waiting for visible audit completion.

It is not a precise benchmark of the core engine.

No strict latency budget is introduced in this step.

Repeated controlled measurements would be needed
before establishing a reliable performance budget.

## Test execution

List tests:

```powershell
npm.cmd exec -- playwright test --config=playwright.robustness.config.ts --list
```

Run tests:

```powershell
npm.cmd exec -- playwright test --config=playwright.robustness.config.ts
```

Expected discovery:

9 tests in 1 file.

## Existing tests

The new suite does not replace existing tests.

All previous Playwright configurations remain
separate and unchanged.

Vitest remains at 489 tests in 28 files unless
a separately approved change adds further tests.

## Diagnostics

Failure traces and screenshots are stored under:

`node_modules/.cache/workflow-inspector-playwright-robustness`

No credentials or real private workflows should
be used in test fixtures.

## Limitations

The tests do not prove that arbitrary-size input
can always be processed successfully.

The browser and operating system impose resource
limits not fully covered by this suite.

The privacy assertions cover specific observable
behaviors, not a full security assessment.

The performance sample does not establish a
service-level objective.

This step does not conduct fuzz testing,
penetration testing, or sustained load testing.

## Acceptance criteria

Step 5.6 can be closed when:

- All 9 robustness tests pass.
- The 5 MiB import boundary behaves as expected.
- The privacy checks pass.
- The 100-node audit completes and reports a timing.
- All 17 accessibility tests continue passing.
- All 489 Vitest tests continue passing.
- Existing E2E suites continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports no errors or warnings.
- Prettier checks pass.
- Manual robustness checks are completed.
- No audit rule or core contract is modified.
- Any detected issue is diagnosed and resolved.
