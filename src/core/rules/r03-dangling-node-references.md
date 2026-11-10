# R03 — Dangling Node References

## Purpose

Detect n8n connections referencing source or destination nodes
that do not exist in the workflow.

## Classification

- Rule ID: R03
- Severity: error
- Confidence: high
- Detection type: deterministic
- Scope: connection-level
- Availability: planned Free edition

## Input

The rule receives a NormalizedWorkflow containing:

- `nodes`: normalized nodes with names and original indices
- `connections`: preserved raw connection data

The `connections` property is optional for compatibility
with existing synthetic workflows.

## Official connection structure

n8n uses source node names as keys in the connections object.

Each source contains connection type groups, which contain
arrays of output branches.

Each branch is an array of connection entries or `null`.

A recognizable connection entry has:

- `node`: destination node name
- `type`: destination input type
- `index`: destination input index

The source output group name and destination input type
do not have to be identical for R03 to recognize a reference.

## Detection policy

- Compare node names using exact string equality.
- Preserve case and whitespace.
- Inspect source node references.
- Inspect destination references within recognizable entries.
- Report one finding for each missing source entry.
- Do not inspect destinations beneath a missing source.
- Report each recognizable missing destination reference.
- Support `main`, AI, and other connection groups.
- Skip malformed structures without throwing exceptions.
- Skip empty or whitespace-only reference names.
- Never modify connections or node names.

## Malformed structures

R03 does not classify malformed connections.

It skips source blocks that are not objects, invalid output
groups, malformed buckets, and malformed connection entries.

For a destination entry to be recognizable, R03 requires:

- A non-empty string `node`
- A non-empty string `type`
- An integer `index` greater than or equal to zero

These are conservative recognition requirements for R03,
not a complete n8n connection validator.

A recognizable missing source may still be reported when
a different part of its connection block is malformed.

The future R04 rule will handle structural validation.

## Node references in findings

A missing source does not have a valid `nodeIndex`.

For a missing destination, `nodeIndex` identifies the source
node, not the nonexistent destination.

If multiple nodes share the source name, R03 omits
`nodeIndex` rather than choosing an ambiguous source.

R02 independently detects duplicate node names.

## Output

Each finding contains:

- `ruleId`: R03
- `severity`: error
- `confidence`: high
- A descriptive title
- A location based on numeric positions
- A recommendation to repair or remove the reference
- An optional `nodeIndex`

The original source and destination names are not included
in finding messages.

## Example

Input:

```json
{
  "nodes": [
    {
      "name": "Source",
      "id": "source-id"
    }
  ],
  "connections": {
    "Source": {
      "main": [
        [
          {
            "node": "Missing Target",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

This example illustrates reference detection; it is not
a complete n8n workflow JSON document.

Expected finding:

```json
{
  "ruleId": "R03",
  "severity": "error",
  "confidence": "high",
  "title": "Connection destination node does not exist",
  "description": "Connection from source entry 1, output group 1, branch 1, item 1 references a destination node that does not exist.",
  "recommendation": "Update the destination reference to an existing node name or remove the connection.",
  "nodeIndex": 0
}
```

Positions in descriptions are one-based.

The `nodeIndex` property is zero-based.

## Limitations

R03 does not validate complete connection structures,
node input/output compatibility, or expression references.

R03 does not repair connections or execute workflows.

Invalid structures can prevent R03 from recognizing a
reference. They are intentionally reserved for R04.

A detected dangling reference does not guarantee that
the entire workflow will fail during execution.

## Official references

n8n workflow interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

n8n connection sanitization:

https://github.com/n8n-io/n8n/blob/master/packages/frontend/editor-ui/src/app/utils/workflowUtils.ts

## Testing

Automated tests are located in:

`src/core/rules/r03-dangling-node-references.test.ts`

Tests cover missing sources, missing destinations,
valid main and AI connections, malformed structures,
ambiguous names, privacy, input integrity, and integration
with the parser, normalizer, and rule executor.
