# R01 — Duplicate Node Identifiers

## Purpose

Detect nodes that share the same non-empty identifier
within a single n8n workflow.

## Classification

- Rule ID: R01
- Severity: error
- Confidence: high
- Detection type: deterministic
- Scope: node-level
- Availability: planned Free edition

## Input

The rule receives a NormalizedWorkflow.

It examines each node's `id` and `nodeIndex`.

## Detection policy

- Compare identifiers using exact string equality.
- Ignore missing identifiers.
- Ignore empty and whitespace-only identifiers.
- Preserve case and surrounding whitespace.
- Report each repeated occurrence after the first.
- Preserve the original node order.
- Never modify node identifiers.

Missing or blank identifiers are outside the scope
of this rule.

## Output

Each duplicate produces a Finding containing:

- `ruleId`: R01
- `severity`: error
- `confidence`: high
- `title`: Duplicate node identifier
- `description`: Positions of the affected nodes
- `recommendation`: Review the duplicated identifiers
- `nodeIndex`: Index of the repeated occurrence

Identifier values are not included in the finding text.

## Example

Input node identifiers:

| Node index | Identifier |
| ---------- | ---------- |
| 0          | node-A     |
| 1          | node-B     |
| 2          | node-A     |

Expected finding:

```json
{
  "ruleId": "R01",
  "severity": "error",
  "confidence": "high",
  "title": "Duplicate node identifier",
  "description": "Node at position 3 shares an identifier with node at position 1.",
  "recommendation": "Review the affected nodes and ensure each has a unique identifier.",
  "nodeIndex": 2
}
```

Positions in the description are one-based.
The `nodeIndex` field is zero-based.

## Limitations

This rule does not detect missing identifiers,
invalid identifier formats, or duplicate node names.

A duplicate identifier is directly verifiable,
but its presence does not guarantee that a workflow
will fail during execution.

Some n8n operations may repair problematic identifiers.

## Official references

n8n workflow publication and node ID recovery:

https://github.com/n8n-io/n8n/blob/master/packages/cli/src/workflows/publication/workflow-publication-applier.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

## Testing

Automated tests are in:

`src/core/rules/r01-duplicate-node-ids.test.ts`

The tests cover duplicate detection, negative cases,
missing identifiers, exact comparisons, privacy,
input integrity, and integration with runRules.
