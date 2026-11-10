# Stage 3 — Final Rule Engine Audit

## Purpose

Verify that Workflow Inspector's ten static audit rules
work together without changing existing implementations.

This audit is the final acceptance checkpoint for
the rule-engine implementation stage.

## Baseline

Before the final integration audit:

- 10 implemented rules
- 250 passing tests
- 17 passing test files
- TypeScript and Vite build passing
- Oxlint passing
- Prettier passing

These results were previously verified through
developer-provided PowerShell output.

## Scope

The audit covers:

- Parser integration
- Workflow normalization
- All rule identifiers from R01 through R10
- Rule execution through runRules()
- Findings ordering and schema compatibility
- Structural and graph-rule separation
- Privacy of finding messages
- Input immutability
- Parser error boundaries
- Executor failure handling
- An adapted official n8n workflow fixture

The audit does not add new production rules
or change existing behavior.

## Rule inventory

| Rule | Responsibility                  |
| ---- | ------------------------------- |
| R01  | Duplicate node IDs              |
| R02  | Duplicate node names            |
| R03  | Dangling node references        |
| R04  | Malformed connection structures |
| R05  | Isolated nodes                  |
| R06  | Disconnected multi-node groups  |
| R07  | Directed main connection cycles |
| R08  | Duplicate connection entries    |
| R09  | Missing or blank node IDs       |
| R10  | Blank node names                |

## Acceptance criteria

The integration test suite must verify:

1. All ten rule IDs appear once in canonical order.
2. An empty valid workflow produces no findings.
3. A clean graph with main and AI connections passes.
4. R01 and R09 report their own problems independently.
5. R02 and R10 report their own problems independently.
6. R03 and R04 distinguish missing references from bad data.
7. R05 detects isolated nodes.
8. R06 detects separate multi-node components.
9. R07 detects directed main cycles.
10. R08 detects duplicate connection entries.
11. Findings do not expose confidential input values.
12. Auditing does not modify raw or normalized data.
13. The adapted official n8n fixture is processed.
14. Invalid input is rejected by the parser.
15. Executor exceptions are sanitized without partial results.

## Required verification

After adding the integration suite, the expected
project state is:

- 265 passing tests
- 18 passing test files
- Successful TypeScript and Vite build
- Zero Oxlint errors and warnings
- Successful Prettier checks

Stage 3 closure must not be approved before
these results have been observed.

## Known limitations

### Skipped analysis

R05, R06, R07, and R08 use conservative analysis.

They can return an empty array when no findings exist
or when invalid graph data causes the analysis to be skipped.

The existing AuditRule contract does not distinguish
these outcomes.

### Heuristic findings

A warning or informational finding does not prove
that a workflow will fail during execution.

For example:

- Isolated nodes may be intentional.
- Disconnected groups may represent separate triggers.
- Directed loops may have correct termination conditions.
- Duplicate connections may not cause repeated execution.

### Parser scope

The parser validates the basic workflow structure.

R04 checks malformed internal connection structures.

The engine does not fully validate every semantic
constraint imposed by every n8n node type.

### Data privacy

The rule-engine tests verify that findings do not
include selected confidential input values.

These tests do not constitute a complete security
audit of the future application.

### Application integration

The rules are executed explicitly by runRules().

This step does not create a production rule registry
or connect the engine to the React interface.

A later stage must implement the application-facing
audit workflow.

### Version compatibility

The included official n8n fixture is adapted for testing.

The audit does not establish compatibility with
every historical or future n8n workflow format.

## Non-goals

This step does not:

- Add R11 or any other rule
- Modify R01 through R10
- Change the parser, normalizer, or executor
- Generate or repair node identifiers
- Repair malformed connections
- Evaluate workflow expressions
- Execute n8n workflows
- Send workflow data to a server
- Connect the engine to React
- Introduce paid features

## Audit artifacts

Integration tests:

`src/core/rules/audit-engine.integration.test.ts`

Audit documentation:

`src/core/rules/stage-3-audit.md`

## Closure policy

The individual rules have already been verified.

Stage 3 may be formally closed only after the
integration test suite and complete regression
checks pass in the developer's environment.

The next development stage requires separate approval.
