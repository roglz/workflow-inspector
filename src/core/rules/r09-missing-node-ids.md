# R09 — Missing or Blank Node IDs

## Purpose

Detect nodes with identifiers that are missing or contain
only whitespace.

R09 complements R01, which detects duplicate non-blank
node identifiers.

## Classification

- Rule ID: R09
- Severity: warning
- Confidence: high
- Detection type: deterministic
- Scope: node-level
- Availability: planned Free edition

## Official format

The current n8n `INode` TypeScript interface declares
the `id` property as a required string.

Workflow Inspector deliberately accepts optional node
identifiers at the parser boundary to remain compatible
with incomplete and potentially older workflow data.

R09 reports missing or blank identifiers after parsing.

It does not claim that every n8n version or import path
rejects such workflows.

## Input

R09 receives a NormalizedWorkflow containing nodes with:

- `nodeIndex`: original zero-based node position
- `id`: a string or undefined
- `name`: original node name
- `type`: original node type

The rule reads only the node identifier and index.

It does not inspect connections, credentials, parameters,
or expressions.

## Detection policy

R09 reports:

- An undefined node identifier
- An empty identifier
- An identifier containing only whitespace

R09 accepts:

- Any non-blank string identifier
- Identifiers containing leading or trailing spaces
- Numeric-looking identifiers represented as strings
- Identifiers that do not follow a UUID format

R09 does not normalize identifiers.

R09 does not compare identifiers against one another.

Duplicate non-blank identifiers remain the responsibility
of R01.

## Finding policy

Each affected node produces one Finding containing:

- `ruleId`: R09
- `severity`: warning
- `confidence`: high
- `title`: Missing or blank node identifier
- `description`: Numeric node position and problem category
- `recommendation`: Assign a unique, non-blank identifier
- `nodeIndex`: Original zero-based node index

Findings preserve the original node order.

Descriptions use one-based node positions.

Original node names and identifiers are not included
in finding messages.

## Examples

A node without an ID:

```json
{
  "name": "Source",
  "type": "example.node",
  "typeVersion": 1,
  "position": [0, 0],
  "parameters": {}
}
```

A node with a blank ID:

```json
{
  "id": "   ",
  "name": "Source",
  "type": "example.node",
  "typeVersion": 1,
  "position": [0, 0],
  "parameters": {}
}
```

These examples show individual nodes, not complete
workflow JSON documents.

An expected finding for a missing identifier at
the first node is:

```json
{
  "ruleId": "R09",
  "severity": "warning",
  "confidence": "high",
  "title": "Missing or blank node identifier",
  "description": "Node at position 1 is missing an identifier.",
  "recommendation": "Assign a non-blank identifier that is unique within the workflow.",
  "nodeIndex": 0
}
```

## Relationship with existing rules

- R01 detects duplicate non-blank identifiers.
- R02 detects duplicate node names.
- R03 detects references to nonexistent nodes.
- R04 detects malformed connection structures.
- R05 detects isolated nodes.
- R06 detects disconnected groups.
- R07 detects directed cycles in main connections.
- R08 detects duplicate connection entries.
- R09 detects missing or blank node identifiers.

R09 does not replace or modify previous rules.

## Limitations

R09 does not:

- Generate identifiers
- Check identifier uniqueness
- Enforce UUID syntax
- Change whitespace or identifier casing
- Predict whether n8n will import the workflow
- Determine whether an identifier is referenced externally
- Execute nodes or expressions
- Modify the workflow

A high-confidence finding means that the identifier
is observably absent or blank.

It does not mean that an import failure is guaranteed.

## Official references

n8n workflow interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow execution tests:

https://github.com/n8n-io/n8n/blob/master/packages/core/src/execution-engine/__tests__/workflow-execute.test.ts

n8n workflow export and import documentation:

https://docs.n8n.io/workflows/export-import/

## Testing

Automated tests:

`src/core/rules/r09-missing-node-ids.test.ts`

Tests cover valid identifiers, missing and blank IDs,
whitespace, order, privacy, input integrity,
independence from connection structures, and integration
with R01-R08 and the existing rule executor.
