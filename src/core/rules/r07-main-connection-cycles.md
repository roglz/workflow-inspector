# R07 — Main Connection Cycles

## Purpose

Detect directed cycles formed by `main` connections
within a single n8n workflow.

Cycles can be intentional in n8n. R07 reports their
presence without claiming that execution will fail.

## Classification

- Rule ID: R07
- Severity: info
- Confidence: medium
- Detection type: deterministic graph observation
- Interpretation: heuristic
- Scope: main connection graph
- Availability: planned Free edition

## Input

R07 receives a NormalizedWorkflow containing:

- `nodes`: normalized node names and original indices
- `connections`: preserved connection data

The rule does not execute workflows or inspect
node parameters, credentials, or expressions.

## Definition

R07 examines directed edges from connection groups
whose source output type is exactly `main`.

AI and other non-main connection groups do not
contribute edges to the analyzed graph.

A directed cycle exists when following main connections
allows a return to the same node.

R07 uses strongly connected components to group
nodes participating in cycles.

A component is reported when:

- It contains at least two nodes, or
- It contains one node with a self-loop

Each qualifying component produces one finding.

## Detection policy

- Require an explicit connections object.
- Require unique, non-blank node names.
- Compare node names exactly.
- Validate all connection structures before analysis.
- Require source and destination references to exist.
- Include only `main` output groups in cycle detection.
- Accept null branches and empty arrays.
- Accept structurally valid non-main connections.
- Ignore parallel edge duplication when reporting cycles.
- Report one finding per cyclic component.
- Preserve the original node order.
- Never modify the workflow.

## Conservative analysis

R07 returns no findings if the connection data
cannot be analyzed reliably.

This includes:

- Missing connections data
- Duplicate node names
- Blank node names
- Malformed connection groups or branches
- Invalid connection entries
- Dangling source or destination references

R01–R04 cover these structural problems.

An empty result can mean that no directed cycle
exists or that the analysis was skipped.

The current AuditRule contract cannot distinguish
these outcomes.

## Finding policy

Each cyclic component produces a Finding containing:

- `ruleId`: R07
- `severity`: info
- `confidence`: medium
- `title`: Directed cycle in main connections
- `description`: Number of nodes in the cyclic component
- `recommendation`: Review the loop and its termination
- `nodeIndex`: Original index of the first component node

Finding messages do not include node names,
identifiers, connection values, or credentials.

The `nodeIndex` field is zero-based.

## Example

Main connections:

- A connects to B.
- B connects to C.
- C connects back to A.
- C also connects to D.

The cycle contains A, B, and C.

D is downstream but is not part of the cyclic component.

Expected finding:

```json
{
  "ruleId": "R07",
  "severity": "info",
  "confidence": "medium",
  "title": "Directed cycle in main connections",
  "description": "Main connections contain a directed cycle involving 3 nodes.",
  "recommendation": "Review whether the loop is intentional and has a reliable termination condition.",
  "nodeIndex": 0
}
```

## Relationship with existing rules

- R03 detects connections referencing nonexistent nodes.
- R04 detects malformed connection structures.
- R05 detects individual isolated nodes.
- R06 detects separate weakly connected groups.
- R07 detects directed cycles within main connections.

R07 does not replace any of these rules.

## Limitations

R07 does not:

- Prove that a loop is infinite
- Determine whether a loop is intentional
- Verify IF or Switch termination conditions
- Interpret Loop Over Items node parameters
- Predict runtime execution counts
- Analyze AI connections as control-flow edges
- Execute nodes or expressions
- Modify or repair connections

n8n supports intentional loops.

The medium confidence level reflects uncertainty
about whether a detected cycle represents a problem,
not uncertainty about the graph calculation.

The rule uses an iterative implementation of
Kosaraju's strongly connected components algorithm.

Expected complexity is O(nodes + main edges), plus
linear validation of all connection entries.

## Official references

n8n workflow connection interfaces:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts

n8n workflow implementation:

https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/workflow.ts

Looping in n8n:

https://docs.n8n.io/build/flow-logic/loop/

Loop Over Items node:

https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/

## Testing

Automated tests:

`src/core/rules/r07-main-connection-cycles.test.ts`

Tests cover directed cycles, self-loops, multiple
components, acyclic graphs, main and AI connection
separation, null branches, malformed inputs,
privacy, integrity, special property names, and
integration with R01–R06 and runRules.
