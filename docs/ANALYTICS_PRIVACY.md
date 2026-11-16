# Analytics and Privacy

## Overview

Workflow Inspector Core is a browser-based static analyzer for n8n workflow
JSON files. Workflow analysis, file import, findings, and report generation
run locally in the browser.

The public demo at https://roglz.github.io/workflow-inspector/ uses
Umami Cloud for website traffic and audit usage analytics.

This document describes the intended analytics data flow and its limits.
It is not a guarantee of anonymity or a substitute for applicable legal
privacy disclosures.

## Analytics events

The public demo tracks:

| Event             | Meaning                          | Custom properties |
| ----------------- | -------------------------------- | ----------------- |
| Pageview          | A visit to the demo              | None              |
| `audit_started`   | A non-empty audit attempt begins | None              |
| `audit_completed` | An audit completes successfully  | None              |
| `audit_failed`    | An audit cannot complete         | `reason` only     |

The `reason` property accepts only these values:

- `invalid_json`: The input is not valid JSON.
- `invalid_structure`: The JSON lacks the required workflow structure.
- `technical_error`: The audit encounters an internal or unexpected error.

Empty submissions do not generate audit events. Importing a file does not
generate an audit event until the user explicitly starts an audit.

The implementation aims to record one start event and one terminal event
per audit attempt. Repeating an audit deliberately creates another pair.

## Workflow data excluded from analytics

Application-generated analytics events do not include:

- The original workflow JSON or pasted text.
- Imported filenames or file contents.
- Node names, node IDs, parameters, or connections.
- Workflow credentials, tokens, or configuration values.
- Audit findings, rule results, or exported reports.
- Raw error messages, exception details, or stack traces.

Only fixed event names and predefined failure categories are sent as
custom event data.

## Pageview and technical metadata

The outgoing analytics payload filter uses a constant public hostname,
page path, and page title. It does not forward URL query parameters,
URL fragments, or referring URLs as custom analytics payload fields.

The payload may include screen dimensions and browser language when they
match expected formats. It also contains the public Umami website ID.

Umami Cloud receives HTTP requests from visitors' browsers. As with
other external services, IP addresses and browser request headers may
be processed by the provider or its infrastructure. Umami documents
that IP addresses are used in anonymous session calculations and may
appear in operational or security logs.

The standard Umami tracker does not use analytics cookies. This does
not mean that HTTP requests contain no personal or network data.

See:

- https://docs.umami.is/docs/metric-definitions
- https://umami.is/privacy

## Tracker restrictions

The integration is configured to:

- Load only for the public HTTPS GitHub Pages demo.
- Remain disabled during local Vite development.
- Skip loading when the Umami website ID is missing or invalid.
- Exclude URL search parameters and hash fragments.
- Respect the browser's Do Not Track setting when available.
- Disable automatic JavaScript exception capture.
- Disable automatic performance measurements.
- Reject unknown analytics event names and properties.
- Continue local auditing when analytics is unavailable.

Do Not Track support depends on the browser. Browser extensions,
network policies, and content blockers may also prevent analytics
requests from reaching Umami.

The integration does not enable session replay or user identification.

## Configuration

The public deployment uses a GitHub Actions repository variable named
`UMAMI_WEBSITE_ID`.

During the Vite production build, GitHub Actions provides this value as
`VITE_UMAMI_WEBSITE_ID`.

The website ID is a public tracking identifier, not an API secret.
No Umami API key is required by the browser application.

## Automated verification

The project includes Vitest tests for event allowlists, failure
classification, sensitive-data exclusion, and tracker configuration.

Playwright browser tests verify audit event behavior, repeated attempts,
file import behavior, and continued operation without Umami.

These tests cover selected scenarios and mocked tracker interactions.
They do not establish a universal privacy guarantee or prove how every
future Umami Cloud version processes server-side requests.

Production network requests and the live Umami dashboard should also be
reviewed after deployment.
