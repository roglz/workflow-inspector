# R08 — Duplicate Connection Entries

## Purpose

Detect repeated connection entries within the same output
branch of an n8n workflow.

Identical entries may be redundant and should be reviewed.

R08 does not claim that duplicate entries necessarily cause
multiple executions of the destination node.

## Classification

- Rule ID: R08
- Severity: warning
- Confidence: medium
- Detection type: deterministic comparison
- Interpretation: heuristic
- Scope: connection-level
- Availability: planned Free edition

## Input

R08 receives a NormalizedWorkflow containing:

- `nodes`: normalized node names and original indices
- `connections`: preserved n8n connection data

R08 does not execute nodes, expressions, or workflows.

## Connection identity

Two entries are duplicates when all of the following match:

- Source node name
- Source connection group
- Source output branch index
- Destination node name (`node`)
- Destination input type (`type`)
- Destination input index (`index`)

Entries in different source output branches are not
considered duplicates.

Entries from different sources are not duplicates.

Additional fields do not change the identity defined by
the three official connection fields.

## Detection policy

- Require an explicit connections object.
- Require unique, non-blank node names.
- Compare source and destination names exactly.
- Validate connection structures before returning findings.
- Require source and destination references to exist.
- Accept main, AI, and other connection groups.
- Accept null branches and empty arrays.
- Compare entries only within the same branch.
- Report every repeated occurrence after the first.
- Preserve the original connection traversal order.
- Never modify or delete connections.

## Connection validation

An entry is recognizable when it contains:

- A non-blank string `node`
- A non-blank string `type`
- A non-negative safe integer `index`

Additional fields are accepted.

If any connection structure is malformed, or if a source
or destination reference is missing, R08 returns no
findings for the entire workflow.

This is a conservative policy.

R02, R03, and R04 handle the corresponding structural
problems.

## Finding policy

Each additional duplicate produces a Finding containing:

- `ruleId`: R08
- `severity`: warning
- `confidence`: medium
- `title`: Duplicate connection entry
- `description`: Numeric positions of both entries
- `recommendation`: Review the repeated connection
- `nodeIndex`: Original index of the source node

Descriptions use one-based positions.

The `nodeIndex` field is zero-based.

Original node names, connection values, and credentials
are not included in finding messages.

## Example

A source node named Start has this main output branch:

```json
[
  {
    "node": "Target",
    "type": "main",
    "index": 0
  },
  {
    "node": "Target",
    "type": "main",
    "index": 0
  }
]
```

If Start is the first node and its connection source entry
is first in the connections object, the expected finding is:

```json
{
  "ruleId": "R08",
  "severity": "warning",
  "confidence": "medium",
  "title": "Duplicate connection entry",
  "description": "Connection source entry 1, group 1, branch 1, item 2 repeats item 1 in the same branch.",
  "recommendation": "Review the repeated connection and remove redundant entries if unintentional.",
  "nodeIndex": 0
}
```

## Relationship with existing rules

- R01 detects duplicate node IDs.
- R02 detects duplicate node names.
- R03 detects references to nonexistent nodes.
- R04 detects malformed connection structures.
- R05 detects isolated nodes.
- R06 detects disconnected groups.
- R07 detects directed cycles in main connections.
- R08 detects repeated entries within individual branches.

R08 does not replace or modify previous rules.

## Limitations

R08 does not:

- Prove that duplicated connections cause repeated execution
- Analyze data passing through connections
- Compare connections across different source branches
- Validate input and output port compatibility
- Resolve workflow expressions
- Execute or repair workflows
- Automatically delete redundant entries

An empty result means either that no duplicates were found
or that the analysis was skipped because the graph was
unreliable.

The current AuditRule contract does not distinguish
these outcomes.

The medium confidence level reflects uncertainty about
the operational significance of a duplicated entry,
not uncertainty about exact equality.

## Official references

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n MCP server tools reference:

https://github.com/n8n-io/n8n-docs/blob/main/docs/connect/connect-to-n8n-mcp-server/mcp-server-tools-reference.md

The official addConnection tool documents that identical
existing connections are not added again. This behavior
is supporting evidence, not a guarantee about every
n8n import mechanism or execution mode.

## Testing

Automated tests:

`src/core/rules/r08-duplicate-connections.test.ts`

The tests cover duplicate entries, source and destination
ports, main and AI groups, multiple branches, malformed
data, missing references, privacy, input integrity,
special property names, and integration with R01–R07.
