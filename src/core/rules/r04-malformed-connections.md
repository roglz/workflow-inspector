# R04 — Malformed Connection Structures

## Purpose

Detect structurally malformed n8n connection data without
executing workflows, repairing connections, or resolving
node references.

## Classification

- Rule ID: R04
- Severity: error
- Confidence: high
- Detection type: deterministic
- Scope: connection-level
- Availability: planned Free edition

## Input

R04 receives a NormalizedWorkflow.

It examines the preserved `connections` object and uses
normalized node names only to determine whether a finding
can be associated with a unique source node.

An absent or empty `connections` object produces no findings.

## Expected connection structure

A connection source maps to an object containing connection
type groups.

Each group maps to an array of output branches.

Each branch is either:

- An array of individual connection objects
- `null`

Individual connection objects require:

- `node`: a non-blank destination name
- `type`: a non-blank destination input type
- `index`: a non-negative safe integer

The index restriction is a deliberate Workflow Inspector
policy. The official n8n TypeScript interface declares a
number, and the reviewed sanitization code checks the
number type but does not enforce this complete restriction.

## Detection policy

R04 reports:

- Blank source node names
- Source blocks that are not objects
- Blank connection group names
- Connection groups that are not arrays
- Branches that are neither arrays nor null
- Connection entries that are not objects
- Missing required fields
- Incorrect field types
- Blank node and type values
- Negative, fractional, non-finite, or unsafe indices

R04 accepts:

- Empty connection maps
- Empty source connection objects
- Empty connection groups
- Empty branch arrays
- Null branches
- Main and AI connection types
- Unknown non-blank group names
- Extra fields on otherwise valid connection entries

## Finding policy

A malformed structural unit produces one finding.

If a container is malformed, R04 reports that container
and does not inspect its descendants.

If multiple fields of the same connection entry are invalid,
R04 produces one finding naming the affected fields.

Finding descriptions use numeric positions and fixed
field names. They do not include original node names,
group names, connection values, or workflow parameters.

The `nodeIndex` field is included only when the source
name identifies exactly one normalized node.

Descriptions use one-based positions.
The `nodeIndex` field is zero-based.

## Relationship with R03

R03 detects recognizable references to nonexistent nodes.

R04 detects malformed connection structures.

R04 does not report a missing source or destination node
solely because the referenced name is absent.

Both rules can report different problems in the same workflow.

## Example

Malformed connection:

```json
{
  "Source": {
    "main": [
      [
        {
          "node": "Target",
          "type": "main",
          "index": "zero"
        }
      ]
    ]
  }
}
```

Expected finding for a workflow where Source is node index 0:

```json
{
  "ruleId": "R04",
  "severity": "error",
  "confidence": "high",
  "title": "Malformed connection structure",
  "description": "Connection source entry 1, group 1, branch 1, item 1 has invalid or missing fields: index.",
  "recommendation": "Repair the connection structure to match the expected n8n format.",
  "nodeIndex": 0
}
```

## Limitations

R04 does not:

- Resolve node references
- Validate the number of ports on a node
- Verify compatibility of input/output connection types
- Execute expressions or workflow nodes
- Repair or delete malformed connections
- Inspect invalid top-level workflows rejected by the parser

The rule intentionally does not reject unknown connection
type names or additional fields on otherwise valid entries.

A high-confidence R04 finding means the data violates
the documented validation policy, not necessarily that
every n8n version will fail when processing the workflow.

## Official references

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n connection sanitization:

https://github.com/n8n-io/n8n/blob/master/packages/frontend/editor-ui/src/app/utils/workflowUtils.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

## Testing

Automated tests:

`src/core/rules/r04-malformed-connections.test.ts`

The tests cover valid and malformed structures, missing
fields, invalid types, incorrect indices, null branches,
privacy, deterministic output, input integrity, and
integration with R03 and the existing rule executor.
