# Workflow Inspector — Audit Entry Point

## Purpose

Provide a single application-facing function for auditing
n8n workflow JSON locally in the browser.

This is the first integration step of Stage 4.

## Public API

Module:

`src/core/audit/audit-workflow-json.ts`

Function:

```typescript
auditWorkflowJson(raw: string): AuditWorkflowResult
```

The function is synchronous.

It does not execute workflow nodes or evaluate expressions.

## Execution pipeline

The function coordinates the existing engine:

1. Parse the raw JSON using `parseWorkflowJson()`.
2. Return the parser error if parsing fails.
3. Normalize the workflow using `normalizeWorkflow()`.
4. Execute R01 through R10 using `runRules()`.
5. Return the rule-execution error if execution fails.
6. Return findings and the total node count on success.

The rule list is private to the audit module.

Its order is R01 through R10.

## Successful result

A successful audit returns:

```typescript
{
  success: true,
  nodeCount: number,
  findings: Finding[],
}
```

`success: true` means the audit completed.

It does not mean the workflow has no findings.

`nodeCount` counts normalized workflow nodes.

`findings` preserves the order produced by the rule executor.

## Failure result

A failed audit returns:

```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
  },
}
```

Rule-execution errors also include `ruleId`.

The supported error codes come from the existing parser
and rule executor:

- `INVALID_JSON`
- `INVALID_STRUCTURE`
- `RULE_EXECUTION_FAILED`
- `INVALID_RULE_RESULT`

The application-facing function preserves these error
results rather than creating new error messages.

## Rule registry

The module contains a private, explicitly ordered array
of the ten existing AuditRule implementations.

The registry is not configurable in this step.

No rules are changed or reimplemented.

## Privacy

The audit function receives a JSON string and processes
it locally.

The module does not use:

- Network requests
- Server APIs
- Browser storage
- Credential access
- Expression evaluation
- Workflow execution

The successful result does not contain the source JSON
or the normalized workflow.

Existing finding messages use the established privacy
policies of R01 through R10.

## Limitations

The current API does not expose a skipped-analysis status.

Some graph rules return no findings when malformed or
ambiguous connection data prevents reliable analysis.

The current API also does not:

- Read files from the user's device
- Implement a drag-and-drop interface
- Display findings in React
- Export audit reports
- Repair workflows
- Support configurable rule selection
- Send data to remote systems

Those capabilities require separate development steps.

## Testing

Automated tests:

`src/core/audit/audit-workflow-json.test.ts`

The tests cover successful audits, parser errors, all ten
rules, deterministic results, privacy, the official
adapted fixture, and data integrity.

## Acceptance criteria

This step is complete when:

- All 18 new tests pass.
- All previous tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- Existing engine files remain unchanged.

The React integration will require separate approval.
