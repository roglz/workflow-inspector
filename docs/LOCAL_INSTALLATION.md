# Workflow Inspector — Local Installation

## 1. Purpose

This guide explains how to install, run, build,
and verify Workflow Inspector locally.

The project uses:

- React
- TypeScript
- Vite
- npm

Workflow Inspector is a browser-based static
analyzer for n8n workflow JSON files.

An n8n server is not required.

## 2. Requirements

To run the project from source, you need:

- A Node.js version compatible with the
  project's current dependencies.
- npm.
- A modern web browser.
- A complete copy of the project, including
  `package.json` and `package-lock.json`.

Use a Node.js version supported by the installed
Vite release and other project dependencies.

The minimum supported Node.js version for the
release has not yet been finalized.

## 3. Checking Node.js and npm

On Windows, open PowerShell and run:

```powershell
node --version
npm.cmd --version
```

Both commands should display installed versions.

If either command fails, check the Node.js
installation and the system PATH.

## 4. Opening the project directory

On the original development machine:

```powershell
cd "$HOME\Desktop\Projects\workflow-inspector"
```

On another machine, replace the path with
the actual project location.

The directory should contain:

- `package.json`
- `package-lock.json`
- `index.html`
- `src/`

## 5. Installing dependencies

From the project root, run:

```powershell
npm.cmd ci
```

This command installs dependencies according
to the existing `package-lock.json`.

It is recommended for reproducing the
project's locked dependency versions.

An n8n installation is not required.

Installing npm dependencies may require
an Internet connection.

## 6. Running the development server

From PowerShell:

```powershell
npm.cmd run dev
```

Vite starts a local development server.

The usual address is:

`http://localhost:5173/`

Check the terminal for the actual URL.

Open that address in your browser.

Press `Ctrl+C` in the terminal to stop
the development server.

## 7. Building the application

From the project root:

```powershell
npm.cmd run build
```

This command runs the project's TypeScript
build checks and compiles the application
using Vite.

Production files are generated under:

`dist/`

A successful build should include:

- `dist/index.html`
- JavaScript files in `dist/assets/`
- CSS files in `dist/assets/`

Generated asset filenames may change
between builds.

## 8. Previewing the production build

After building, run:

```powershell
npm.cmd exec -- vite preview --host 127.0.0.1 --port 4180 --strictPort
```

Open:

`http://127.0.0.1:4180/`

This serves the compiled files for
local verification.

Vite Preview is not intended to operate
as a public production web server.

Press `Ctrl+C` to stop it.

## 9. Static distribution

The output of the production build is
a compiled web application.

The `dist/` directory can be served
through a compatible static HTTP server.

A release package containing compiled
files must be prepared and verified
before distribution.

Do not assume that opening
`dist/index.html` directly using a
`file://` URL will work correctly.

The hosting environment must respect
the application's configured asset paths.

The final distribution method will be
defined during release preparation.

## 10. Checking the installation

With the application open:

1. Locate the **Workflow JSON** field.
2. Enter this example:

```json
{
  "nodes": [],
  "connections": {}
}
```

3. Select **Analyze JSON**.
4. Confirm that the audit completes.
5. Verify that the node count is zero.
6. Optionally select **Export JSON report**
   to verify the download.

This example uses synthetic data.

## 11. Running unit and integration tests

From the project root:

```powershell
npm.cmd run test
```

The approved Stage 5 reference includes:

- 489 passing Vitest tests.
- 28 test files.

These counts may change when tests
or features are added.

## 12. Checking code quality

Run:

```powershell
npm.cmd run lint
npm.cmd run format:check
```

The first command runs Oxlint.

The second checks the formatting
of the files covered by the current
source formatting configuration.

Additional documentation and Playwright
format checks are included in the
consolidated verification script.

## 13. Running the complete verification

From Windows PowerShell:

```powershell
powershell.exe -NoProfile -File .\scripts\verify-stage5.ps1
```

This script runs:

- Vitest.
- TypeScript and Vite build.
- Oxlint.
- Source formatting checks.
- Playwright and documentation formatting.
- Development E2E tests.
- Production E2E tests.
- Cross-browser development E2E tests.
- Cross-browser production E2E tests.
- Accessibility E2E tests.
- Robustness E2E tests.

Development dependencies and Playwright
browser binaries must be available.

If necessary, install the required
Playwright-managed browsers:

```powershell
npm.cmd exec -- playwright install chromium firefox webkit
```

The complete verification is intended
for development and release validation.

End users do not need Playwright to use
an already hosted static build.

## 14. Troubleshooting

### Node.js is unavailable

Run:

```powershell
node --version
```

Check the Node.js installation and PATH.

### Dependencies are missing

From the project root, run:

```powershell
npm.cmd ci
```

### The port is already in use

Stop any process currently using
the selected port.

Also check for an existing Vite or
Vite Preview process.

### The build fails

Run:

```powershell
npm.cmd run build
```

Review the first TypeScript or Vite
error displayed in the terminal.

### The browser cannot load assets

Check that the HTTP server correctly
serves `index.html` and `assets/`.

Do not combine `index.html` from one
build with assets from another build.

### Browser tests cannot start

Check that the required Playwright
browser binaries are installed.

They must be compatible with the
Playwright version used by the project.

## 15. Privacy

Workflow Inspector is designed to
analyze JSON locally in the browser.

It does not execute workflows or
require n8n credentials.

Automated tests verified local audit
and export behavior in selected scenarios.

Review any generated report before
sharing it externally.

## 16. Limitations

This guide covers source installation,
local execution, and build verification.

It does not provide instructions for:

- Public website deployment.
- HTTPS or domain configuration.
- Desktop installers.
- n8n server integration.
- npm publication.
- External infrastructure management.

Distribution and hosting decisions
will be addressed in later release steps.

## 17. Additional documentation

- [User guide](USER_GUIDE.md)
- [Stage 5 technical validation](STAGE_5_VALIDATION.md)
- [Stage 6 release preparation](STAGE_6_RELEASE_PREPARATION.md)

Document filenames will be standardized
during the release documentation migration.
