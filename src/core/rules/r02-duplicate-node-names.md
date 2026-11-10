# R02 — Duplicate Node Names

## Purpose

Detect nodes sharing the same name within a single n8n workflow.

Duplicate names can create ambiguity because n8n uses node names
to reference nodes in connections, expressions, and internal lookups.

## Classification

- Rule ID: R02
- Severity: error
- Confidence: high
- Detection type: deterministic
- Scope: node-level
- Availability: planned Free edition

## Input

The rule receives a NormalizedWorkflow.

It examines:

- `node.name`
- `node.nodeIndex`

It does not examine node identifiers or connections.

## Detection policy

- Compare names using exact string equality.
- Preserve uppercase and lowercase differences.
- Preserve leading and trailing whitespace.
- Detect repeated empty names.
- Detect repeated whitespace-only names.
- Report each repeated occurrence after the first.
- Preserve the original order of nodes.
- Never rename or modify nodes.

A single empty name does not activate this rule.

## Output

Each duplicate produces a Finding containing:

- `ruleId`: R02
- `severity`: error
- `confidence`: high
- `title`: Duplicate node name
- `description`: Positions of the affected nodes
- `recommendation`: Rename the affected nodes
- `nodeIndex`: Index of the repeated occurrence

Original node names are not included in finding messages.

## Example

Input:

| Node index | Name         |
| ---------- | ------------ |
| 0          | HTTP Request |
| 1          | Edit Fields  |
| 2          | HTTP Request |

Expected finding:

```json
{
  "ruleId": "R02",
  "severity": "error",
  "confidence": "high",
  "title": "Duplicate node name",
  "description": "Node at position 3 shares a name with node at position 1.",
  "recommendation": "Rename the affected nodes so each has a unique name.",
  "nodeIndex": 2
}
```

Positions displayed in descriptions are one-based.

The `nodeIndex` property is zero-based.

## Limitations

R02 does not detect duplicate node IDs.

It does not validate whether an individual name is allowed
by n8n or whether an expression references an existing node.

Names differing only in case or whitespace are not considered
duplicates by this rule.

The rule does not guarantee that duplicate names will cause
workflow execution to fail.

## Official references

n8n workflow interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

n8n documentation on node references:

https://docs.n8n.io/data/data-mapping/data-mapping-ui/

## Testing

Automated tests are located in:

`src/core/rules/r02-duplicate-node-names.test.ts`

Tests cover duplicate detection, unique names, exact matching,
empty names, privacy, input integrity, and integration with
the parser, normalizer, and rule executor.
