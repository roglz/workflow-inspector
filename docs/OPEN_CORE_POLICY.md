# Workflow Inspector — Open Core Policy

## Overview

Workflow Inspector follows an Open Core product model.

Workflow Inspector Core is the free, open-source foundation.
Workflow Inspector Pro is a planned proprietary edition focused on
advanced workflows and productivity features.

Core is intended to remain useful as a standalone application.

## Workflow Inspector Core

**Edition:** Free and open source  
**Version:** 0.1.0  
**License:** Apache License 2.0

Core includes:

- Local import and analysis of individual n8n workflow JSON files.
- Workflow JSON parsing and normalization.
- The rule-based audit engine.
- All ten existing audit rules, R01 through R10.
- Detailed findings with severity and confidence information.
- Local search, filtering, and grouping of findings.
- Basic JSON report export.
- Automated tests and technical documentation.

Core processes workflow data locally in the browser.

The existing ten rules are not reserved for paying users.

Core does not require a Pro subscription to use its implemented
features.

## Workflow Inspector Pro

**Edition:** Planned commercial product  
**License:** Proprietary; terms not yet published  
**Availability:** Not released

Candidate Pro capabilities include:

- Analyzing multiple workflows in one operation.
- Comparing workflow versions.
- Advanced JSON and HTML reports.
- Custom audit rules.
- Reusable audit profiles.
- Additional productivity features validated with users.

These capabilities are plans, not promises of availability
or a published product specification.

Pro is intended to provide value through time savings and
advanced workflows rather than artificial limitations of Core.

## Licensing Boundaries

Workflow Inspector Core is licensed under Apache License 2.0.

The Core license permits use, modification, and redistribution
subject to its terms.

The planned Pro edition will use separate proprietary terms.

Publishing Core under Apache-2.0 does not require future,
separately developed proprietary features to be released
under the same license.

Third-party components retain their respective licenses
and attribution requirements.

## Current Release Status

Core version 0.1.0 is undergoing release preparation.

A public repository release has not yet been completed.
The package remains marked private to prevent accidental
publication to npm.

Workflow Inspector Pro has not yet been released.

## Independence

Workflow Inspector is an independent project.

It is not affiliated with or endorsed by n8n GmbH.

## Legal and Attribution Documents

- [Apache License 2.0](../LICENSE)
- [Project notice and source attribution](../NOTICE)
- [Third-party dependency notices](../THIRD_PARTY_NOTICES.txt)
