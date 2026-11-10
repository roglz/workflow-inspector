# R05 — Isolated Nodes

## Purpose

Detect nodes that have no incoming or outgoing connections
within a single n8n workflow.

An isolated node can be intentional. R05 provides a review
warning rather than declaring that the workflow is broken.

## Classification

- Rule ID: R05
- Severity: warning
- Confidence: medium
- Detection type: deterministic graph observation
- Interpretation: heuristic
- Scope: node-level
- Availability: planned Free edition

## Input

R05 receives a NormalizedWorkflow containing:

- `nodes`: normalized nodes and their original indices
- `connections`: preserved connection data

R05 does not inspect node parameters, credentials,
expressions, or runtime execution data.

## Definition

A node is isolated when it has no incoming and no outgoing
connection edges.

Connections are considered across all group types,
including `main`, AI, and custom groups.

An empty group, empty branch, or null branch does not
represent a connection edge.

A self-loop counts as an edge.

This rule does not detect disconnected groups of nodes.
It only detects individual nodes with zero connections.

## Detection policy

- Require at least two nodes.
- Require an explicit connections object.
- Compare node names exactly.
- Require unique, non-blank node names.
- Examine source and destination references.
- Consider all recognized connection group types.
- Preserve the original node order.
- Report each isolated node once.
- Never modify the workflow.

## Conservative analysis policy

R05 returns no findings if the graph is unreliable.

This includes:

- Duplicate node names
- Blank node names
- Missing connections data
- Malformed source blocks
- Malformed connection groups or branches
- Malformed individual connection entries
- Connections referencing nonexistent nodes

R01–R04 are responsible for their corresponding
structural problems.

An empty result therefore means either that no isolated
nodes were found or that R05 deliberately skipped
the analysis.

The current AuditRule contract cannot distinguish these
two outcomes. A future analysis status model may address
this limitation.

## Connection recognition

A connection entry is recognizable when it contains:

- A non-blank string `node`
- A non-blank string `type`
- A non-negative safe integer `index`

Extra fields are tolerated.

## Finding policy

Each isolated node produces one Finding containing:

- `ruleId`: R05
- `severity`: warning
- `confidence`: medium
- `title`: Isolated node
- `description`: Original numeric node position
- `recommendation`: Review the node's intended connectivity
- `nodeIndex`: Original zero-based node index

Node names and workflow values are not included
in finding messages.

## Example

The workflow contains three nodes:

| Node index | Node   | Connections                   |
| ---------- | ------ | ----------------------------- |
| 0          | Start  | Sends to Target               |
| 1          | Target | Receives from Start           |
| 2          | Unused | No incoming or outgoing edges |

Expected finding:

```json
{
  "ruleId": "R05",
  "severity": "warning",
  "confidence": "medium",
  "title": "Isolated node",
  "description": "Node at position 3 has no incoming or outgoing connections.",
  "recommendation": "Review whether this node should be connected or is intentionally standalone.",
  "nodeIndex": 2
}
```

Descriptions use one-based positions.
The `nodeIndex` field is zero-based.

## Limitations

R05 does not:

- Prove that a disconnected node is an error
- Detect separate connected subgraphs
- Determine whether a node is an execution trigger
- Check whether a node is disabled
- Validate the execution path of the workflow
- Execute nodes or expressions
- Repair or remove nodes

A node can be intentionally isolated during development.

The confidence level reflects uncertainty about whether
isolation is problematic, not uncertainty about the
observed absence of connections.

## Official references

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

## Testing

Automated tests:

`src/core/rules/r05-isolated-nodes.test.ts`

Tests cover isolated nodes, connected graphs, AI connections,
self-loops, null branches, ambiguous or malformed inputs,
privacy, input integrity, special property names, and
integration with R01–R04 and the rule executor.
