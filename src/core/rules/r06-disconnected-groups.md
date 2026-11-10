# R06 — Disconnected Node Groups

## Purpose

Identify multiple connected groups of two or more nodes
that have no connections between them.

The observation may indicate independent branches
or unfinished workflow construction.

Disconnected groups are not necessarily errors.

## Classification

- Rule ID: R06
- Severity: info
- Confidence: medium
- Detection type: deterministic graph observation
- Interpretation: heuristic
- Scope: connected groups
- Availability: planned Free edition

## Input

R06 receives a NormalizedWorkflow containing:

- `nodes`: normalized node names and indices
- `connections`: preserved n8n connection data

No node parameters, credentials, or expressions are executed.

## Definition

R06 computes weakly connected components.

For component detection, connection direction is ignored.
Connections remain unmodified in the original workflow.

All connection groups count, including:

- `main`
- `ai_languageModel`
- `ai_tool`
- `ai_memory`
- Other recognized connection groups

Null branches and empty arrays do not create graph edges.

A self-loop does not turn a single node into a
multi-node group.

## Detection policy

- Require at least four nodes.
- Require an explicit connections object.
- Require unique, non-blank node names.
- Validate connection structures before analysis.
- Require all source and destination names to exist.
- Identify weakly connected components.
- Ignore components containing only one node.
- Report only if at least two multi-node groups exist.
- Generate one finding for each such group.
- Preserve the original node order.
- Never modify the workflow.

## Conservative analysis

R06 returns no findings when the graph is unreliable.

Examples include:

- Missing connections data
- Duplicate or blank node names
- Malformed source blocks
- Malformed connection groups or branches
- Invalid connection entries
- References to nonexistent nodes

R01–R04 cover those structural problems.

An empty result can mean that no qualifying groups
exist or that analysis was skipped.

The current AuditRule contract cannot communicate a
separate skipped-analysis status.

## Relationship with R05

R05 detects individual nodes with no connections.

R06 detects separate groups containing two or more nodes.

For a workflow with one connected group and three
isolated nodes, R05 may report the isolated nodes,
while R06 reports nothing.

For a workflow with two connected pairs, R06 reports
both groups.

## Finding policy

Each qualifying group produces one Finding:

- `ruleId`: R06
- `severity`: info
- `confidence`: medium
- `title`: Disconnected node group
- `description`: Group size and separation observation
- `recommendation`: Review intentional separation
- `nodeIndex`: First group node in original workflow order

Node names, identifiers, and connection values do not
appear in finding messages.

The `nodeIndex` field is zero-based.

## Example

Workflow structure:

- Node A connects to Node B.
- Node C connects to Node D.
- No connection exists between the two pairs.

Expected findings:

```json
[
  {
    "ruleId": "R06",
    "severity": "info",
    "confidence": "medium",
    "title": "Disconnected node group",
    "description": "A group of 2 connected nodes is separate from at least one other multi-node group.",
    "recommendation": "Review whether these separate branches are intentional or should be connected.",
    "nodeIndex": 0
  },
  {
    "ruleId": "R06",
    "severity": "info",
    "confidence": "medium",
    "title": "Disconnected node group",
    "description": "A group of 2 connected nodes is separate from at least one other multi-node group.",
    "recommendation": "Review whether these separate branches are intentional or should be connected.",
    "nodeIndex": 2
  }
]
```

## Limitations

R06 does not:

- Prove that disconnected groups are incorrect
- Determine which trigger executes a group
- Detect nodes unreachable from a particular trigger
- Validate execution order
- Interpret expressions or runtime dependencies
- Check whether nodes are enabled or disabled
- Repair or connect separate groups

Multiple triggers and separate workflows within
one n8n canvas can be intentional.

Confidence medium reflects uncertainty about whether
the observed separation deserves corrective action.

The graph connectivity itself is determined by
a deterministic algorithm.

## Official references

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

n8n documentation on combining multiple triggers:

https://docs.n8n.io/build/integrate-ai/test-and-improve-ai-workflows/fix-common-issues/

## Testing

Automated tests:

`src/core/rules/r06-disconnected-groups.test.ts`

Tests cover connected groups, isolated nodes, connection
types, null branches, malformed data, ambiguous names,
privacy, input integrity, and integration with R01–R05.
