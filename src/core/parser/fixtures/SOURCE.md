# n8n Demo Workflow Fixture

## Original source

Repository:
https://github.com/n8n-io/self-hosted-ai-starter-kit

Original workflow:
https://raw.githubusercontent.com/n8n-io/self-hosted-ai-starter-kit/refs/heads/main/n8n/demo-data/workflows/srOnR8PAY3u4RSwb.json

Original project copyright: n8n GmbH.

License: Apache License 2.0.
See LICENSE-APACHE-2.0.txt.

Source reviewed: 2026-11-03.

## Modifications

This fixture is derived from the official n8n demo workflow.

The following modifications were made:

- Replaced original node IDs with fixture-specific IDs.
- Removed credential references.
- Removed the webhook identifier.
- Removed workflow-specific IDs, timestamps, and version metadata.
- Removed unnecessary metadata.
- Preserved node names, types, versions, positions, parameters,
  and the original connection structure.

This is an adapted fixture, not an unmodified n8n export.

## Purpose

Used exclusively for automated parser compatibility tests.

The workflow is never executed.

Tests operate on local JSON files without connecting to n8n
or external services.

## Scope

Passing this fixture does not establish compatibility
with every n8n version or workflow structure.
