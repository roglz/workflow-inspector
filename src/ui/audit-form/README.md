# Stage 4 — Local JSON Audit Form

## Purpose

Provide the first React interface for Workflow Inspector.

Users can paste workflow JSON, start a local audit,
and see a basic summary or an error.

This is Step 4.2.

## Scope

Implemented:

- Controlled JSON textarea
- Analyze JSON submit button
- Empty-input validation
- Local execution through auditWorkflowJson()
- Basic node and finding counts
- Parser and executor error feedback
- Clearing stale results after editing
- Responsive styling
- Accessible labels and status messages

Not implemented:

- JSON file uploads
- Drag and drop
- Detailed finding lists
- Severity filtering
- Report export
- Workflow repair
- Workflow execution

## Files

React screen:

`src/App.tsx`

Form reducer:

`src/ui/audit-form/audit-form-state.ts`

Styles:

`src/ui/audit-form/audit-form.css`

Tests:

`src/ui/audit-form/audit-form-state.test.tsx`

## Data flow

1. The user enters JSON in the textarea.
2. React dispatches an edit action.
3. The reducer updates the input and clears old feedback.
4. The user submits the form.
5. The submit handler prevents default browser submission.
6. React dispatches the submit action.
7. Empty input returns local validation feedback.
8. Non-empty input is passed to auditWorkflowJson().
9. The reducer stores the audit result.
10. The interface shows node and finding counts or an error.

## Privacy

The submitted JSON stays in React memory.

The new interface does not use:

- fetch()
- XMLHttpRequest
- Network APIs
- localStorage
- sessionStorage
- Cookies
- Telemetry
- Server-side workflow processing

The audit engine remains browser-local.

The JSON can remain visible in the editable textarea.
Feedback messages do not repeat the original input.

## Successful audits

The interface displays:

- Audit completed
- Number of normalized nodes
- Number of findings

A completed audit may contain findings.

A finding does not automatically mean the workflow
will fail at runtime.

## Failed audits

The interface displays fixed English messages for:

- INVALID_JSON
- INVALID_STRUCTURE
- RULE_EXECUTION_FAILED
- INVALID_RULE_RESULT

Unknown error codes receive a generic message.

Original JSON and internal error messages are not
copied into the feedback area.

## Empty input

Empty and whitespace-only submissions display
a validation message.

They do not call the audit engine.

## Editing after an audit

Editing the textarea removes the previous feedback.

This prevents displaying results that refer to
an older version of the JSON.

## Testing

The automated tests cover:

- Initial state
- Exact text updates
- Empty and whitespace-only input
- Successful audits
- Finding counts from R01 and R09
- Parser failures
- Input preservation
- Clearing previous results
- Safe error messages
- Initial React markup

The reducer tests simulate state transitions.

Server-side rendering verifies the initial markup.

Real typing, clicking, and visual updates require
manual browser verification in this step.

## Manual verification

Start the application using:

`npm.cmd run dev`

Verify:

1. Empty submission shows an error.
2. Valid empty workflow shows zero nodes and findings.
3. Malformed JSON shows an error.
4. A workflow missing a node ID produces an R09 finding.
5. Editing after auditing clears old feedback.
6. Reloading the page clears the pasted JSON.

## Limitations

The JSON parser and audit engine run synchronously.

Very large inputs may temporarily block the interface.

This step does not provide detailed findings, upload
files, or enforce an input-size limit.

The React screen is the first application-facing
integration, not the final user interface.

## Acceptance criteria

This step is complete when:

- All 17 new tests pass.
- Previous tests continue to pass.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Manual browser scenarios behave as documented.
- R01-R10 and the core audit facade remain unchanged.
