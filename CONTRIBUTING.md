# Contributing to Workflow Inspector Core

Thank you for your interest in contributing to Workflow Inspector Core.

Workflow Inspector Core is a local-first, browser-based tool for inspecting
n8n workflow JSON files. The Core project is open source under the
Apache License 2.0.

Please follow the conventions below to keep contributions clear,
consistent, and easy to review.

## 1. Branch Naming

Use the following format:

`<type>/<short-description>`

### Allowed Branch Types

| Prefix      | Purpose                                         |
| ----------- | ----------------------------------------------- |
| `feat/`     | New features                                    |
| `fix/`      | Bug fixes                                       |
| `hotfix/`   | Urgent production fixes                         |
| `docs/`     | Documentation changes                           |
| `refactor/` | Internal restructuring without behavior changes |
| `chore/`    | Maintenance and general tasks                   |
| `test/`     | Adding or modifying tests                       |

### Branch Naming Rules

- Use English and lowercase letters.
- Separate words with hyphens (`kebab-case`).
- Keep names short, clear, and descriptive.
- Do not use spaces, accents, or special characters.
- Use one branch for one specific task or change.

### Examples

```text
feat/add-batch-validation
fix/invalid-json-handling
hotfix/critical-parser-error
docs/update-readme
refactor/simplify-rule-engine
chore/update-dependencies
test/add-parser-edge-cases
```

The `main` branch is the stable default branch and is exempt from
the feature-branch naming format.

## 2. Commit Message Naming

Use Conventional Commits.

Standard format:

`<type>: <short-description>`

### Allowed Commit Types

| Type        | Purpose                                   |
| ----------- | ----------------------------------------- |
| `feat:`     | New functionality                         |
| `fix:`      | Bug fixes                                 |
| `docs:`     | Documentation-only changes                |
| `refactor:` | Internal changes without behavior changes |
| `chore:`    | General maintenance                       |
| `test:`     | Adding or modifying tests                 |
| `style:`    | Formatting without functional changes     |
| `perf:`     | Performance improvements                  |
| `build:`    | Dependency or build-system changes        |
| `ci:`       | CI/CD configuration changes               |

### Commit Message Rules

- Write commit messages in English.
- Use lowercase commit types.
- Separate the type and description with `: `.
- Clearly describe what changed.
- Keep the first line concise, preferably within 72 characters.
- Do not end the subject line with a period.
- Make each commit a logical, coherent change.
- Avoid vague subjects such as `update`, `changes`, `fix stuff`, or `WIP`.

### Examples

```text
feat: add workflow comparison
fix: handle malformed node connections
docs: update installation instructions
refactor: simplify the audit engine
chore: update dependencies
test: add parser validation cases
style: format code with prettier
perf: optimize rule evaluation
ci: add GitHub Actions checks
```

### Optional Scopes

Use a scope when it helps identify the affected module:

```text
feat(parser): support additional workflow fields
fix(audit): handle missing node identifiers
docs(readme): clarify local installation
```

### Breaking Changes

Add `!` before the colon when a commit introduces an incompatible change:

```text
feat(api)!: change the audit report format
```

Explain the migration or compatibility impact in the commit body
when applicable.

## 3. Contribution Workflow

1. Start from an up-to-date `main` branch.
2. Create a new branch using the required naming convention.
3. Keep the change focused on one task.
4. Update or add tests when behavior changes.
5. Run the appropriate validation commands.
6. Commit changes using Conventional Commits.
7. Open a pull request targeting `main`.

For changes to application code, run:

```powershell
npm.cmd run build
npm.cmd run test
npm.cmd run lint
```

For documentation-only changes, review Markdown formatting,
links, and technical accuracy.

## 4. Pull Request Guidelines

- Use a clear, descriptive pull request title.
- Explain what changed and why.
- Reference related issues when applicable.
- Describe relevant testing and verification.
- Keep unrelated changes in separate pull requests.
- Do not commit generated build output or installed dependencies.

## 5. Open Core Scope

The capabilities included in Workflow Inspector Core are free and
open source under the Apache License 2.0 license.

Future Pro capabilities are planned separately and are not part of
the current Core release.

Contributions to this repository should remain within the
open-source Core scope.

## 6. Security and Privacy

- Do not commit passwords, tokens, API keys, or private credentials.
- Do not include sensitive data from real n8n workflows.
- Prefer synthetic or appropriately licensed test fixtures.
- Keep workflow inspection local and do not introduce unexpected
  data uploads or workflow execution.
- Do not disclose exploitable security details publicly before
  an appropriate private reporting path has been established.

## 7. Licensing and Attribution

By contributing, you agree that your contributions are distributed
under the project's Apache License 2.0.

Preserve applicable third-party licenses, notices, and attribution
requirements.

See `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.txt` for details.
