# R10 — Blank Node Names

## Purpose

Detect n8n workflow nodes whose names are empty or
contain only whitespace.

The rule complements R02, which detects exact
duplicate node names.

## Classification

- Rule ID: R10
- Severity: warning
- Confidence: high
- Detection type: deterministic
- Scope: node-level
- Availability: planned Free edition

## Official context

n8n uses node names to identify nodes in workflow
connections and in parts of its workflow API.

Official n8n tooling requires a node name when
creating a node and documents unique node names.

However, these facts do not establish that every
n8n import path rejects empty or whitespace-only
node names.

R10 is therefore a quality and compatibility
warning, not a prediction of execution failure.

## Input

R10 receives a NormalizedWorkflow containing:

- `nodes`: normalized nodes with their original indices
- `connections`: optional preserved connection data

R10 reads only each node's name and index.

It does not need connection information.

## Detection policy

R10 reports:

- An empty string name
- A name containing only ordinary spaces
- A name containing only tabs or line breaks
- A name containing only whitespace removed by
  JavaScript String.prototype.trim()

R10 accepts:

- Any non-blank string name
- Names with leading or trailing whitespace
- Names containing internal spaces
- Non-Latin names
- Names containing symbols or punctuation

R10 does not normalize names or enforce naming
conventions.

## Parser boundary

Workflow Inspector requires a string node name
during parsing.

The current parser permits empty and whitespace-only
strings.

Missing, null, or non-string names are rejected by
the parser as INVALID_STRUCTURE before R10 runs.

R10 does not attempt to recover rejected documents.

## Finding policy

Each affected node produces one Finding:

- `ruleId`: R10
- `severity`: warning
- `confidence`: high
- `title`: Blank node name
- `description`: Numeric position and problem category
- `recommendation`: Assign a descriptive name
- `nodeIndex`: Original zero-based node index

Findings preserve the original node order.

Descriptions use one-based positions.

Original names, IDs, node types, parameters, and
credential data are not included in finding messages.

## Example

A node with a blank name:

```json
{
  "id": "node-1",
  "name": "   ",
  "type": "example.node",
  "typeVersion": 1,
  "position": [0, 0],
  "parameters": {}
}
```

This is an individual node example, not a complete
n8n workflow document.

Expected finding:

```json
{
  "ruleId": "R10",
  "severity": "warning",
  "confidence": "high",
  "title": "Blank node name",
  "description": "Node at position 1 has an empty or whitespace-only name.",
  "recommendation": "Assign a non-blank, descriptive name and review references to the node.",
  "nodeIndex": 0
}
```

## Relationship with existing rules

- R01 detects duplicate node identifiers.
- R02 detects duplicate node names.
- R03 detects references to nonexistent nodes.
- R04 detects malformed connection structures.
- R05 detects isolated nodes.
- R06 detects disconnected connected groups.
- R07 detects directed main connection cycles.
- R08 detects duplicate connection entries.
- R09 detects missing or blank node identifiers.
- R10 detects blank node names.

R10 does not replace or modify previous rules.

A workflow can produce R02 and R10 findings when
multiple nodes share the same blank name.

R10 does not suppress its findings because of
other structural problems.

## Limitations

R10 does not:

- Detect missing names rejected by the parser
- Check whether a name is duplicated
- Enforce a specific naming convention
- Enforce length limits
- Rename nodes
- Update connection or expression references
- Predict whether n8n will import the workflow
- Execute nodes or expressions
- Modify any workflow data

JavaScript trim() does not remove every visually
invisible Unicode character.

For example, a zero-width space (U+200B) does not
count as whitespace under this detection policy.

High confidence refers to the observed blank name,
not to an expected execution outcome.

## Official references

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n MCP server tools reference:

https://github.com/n8n-io/n8n-docs/blob/main/docs/connect/connect-to-n8n-mcp-server/mcp-server-tools-reference.md

## Testing

Automated tests:

`src/core/rules/r10-blank-node-names.test.ts`

Tests cover blank and valid names, Unicode whitespace,
node ordering, parser boundaries, independence from
other rules, privacy, input integrity, and integration
with R01-R09 and the existing rule executor.
