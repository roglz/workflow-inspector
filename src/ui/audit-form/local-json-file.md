# Stage 4 — Local JSON File Import

## Purpose

Allow users to select a local n8n workflow JSON file
and load its contents into the existing React textarea.

This is Step 4.4 of Workflow Inspector.

File selection does not automatically run an audit.

## Scope

Implemented:

- Local file selection
- JSON filename extension validation
- A 5 MiB file-size limit
- UTF-8 file reading
- Empty-file validation
- Safe read-error messages
- File-loading feedback
- Protection against stale asynchronous reads
- Preservation of manual JSON editing
- Reuse of the existing audit form

Not implemented:

- Drag and drop
- Multiple-file import
- Automatic auditing after file selection
- File-system writing
- Exporting modified workflows
- File uploads to a server
- Persistent storage
- New audit rules

## Files

Local file reader:

`src/ui/audit-form/local-json-file.ts`

Tests:

`src/ui/audit-form/local-json-file.test.tsx`

Styles:

`src/ui/audit-form/local-json-file.css`

React integration:

`src/App.tsx`

Documentation:

`src/ui/audit-form/local-json-file.md`

## Browser API

The implementation reads selected files using:

`File.text()`

This browser API returns a promise containing the file
contents decoded as UTF-8 text.

The application does not use FileReader, fetch,
XMLHttpRequest, or remote upload endpoints.

## Validation

Accepted filenames end with `.json`.

The extension check is case-insensitive.

Examples:

- `workflow.json`
- `workflow.JSON`
- `workflow.backup.json`

Rejected examples:

- `workflow.txt`
- `workflow.json.txt`
- `workflow`

The HTML accept attribute helps the native file picker
but does not replace application-side validation.

The MIME type is not required to be application/json.

The maximum permitted file size is:

5,242,880 bytes (5 MiB).

The size check happens before the file is read.

Files of zero bytes and files containing only
whitespace are rejected.

## Reading and auditing

Selecting a valid file:

1. Clears previous audit feedback.
2. Starts an asynchronous local read.
3. Displays a reading message.
4. Places the returned text into the textarea.
5. Displays a loaded message.
6. Leaves the audit button available.

The file contents are not parsed during import.

The user must explicitly press Analyze JSON.

The existing auditWorkflowJson() function then performs
parsing, normalization, and rule execution.

Invalid JSON files may therefore load successfully
and later produce an INVALID_JSON audit result.

## Concurrent file selections

A revision counter identifies the latest import.

When a new file is selected, any older pending result
becomes obsolete.

Only the latest result may update the React interface.

When the user edits the textarea manually, the current
import revision is invalidated.

The browser may finish a discarded read, but its result
will not be applied to the interface.

This is logical cancellation, not physical cancellation
of the file-reading operation.

## Existing text

When file reading fails, the previous textarea content
is preserved.

Previous audit feedback is cleared when a new file
selection starts.

When a file loads successfully, its text replaces
the existing textarea content.

The user may modify the imported text freely.

Manual editing clears file-loading feedback and
invalidates pending imports.

## Error codes

The file import layer supports:

| Code              | Meaning                        |
| ----------------- | ------------------------------ |
| INVALID_FILE_TYPE | Unsupported filename extension |
| FILE_TOO_LARGE    | File exceeds 5 MiB             |
| EMPTY_FILE        | Empty or whitespace-only file  |
| FILE_READ_FAILED  | Reading failed                 |

These codes are separate from audit engine errors.

Visible error messages are fixed English strings.

Original filenames, paths, read exceptions, and
file contents are not included in these messages.

## Privacy

Selected file contents are handled locally in
the browser.

The feature does not send workflow JSON to a server.

It does not use:

- fetch()
- XMLHttpRequest
- localStorage
- sessionStorage
- Remote APIs
- Cookies
- Workflow execution
- Expression evaluation

The imported JSON is held in React memory, like
manually pasted content.

The file picker is cleared after selection so the
same file can be selected again.

The file contents are not automatically saved.

## Accessibility

The file input has an associated label.

Instructions are connected using aria-describedby.

Reading and successful-loading messages use role=status.

Errors use role=alert.

The audit button is disabled during the current
file-reading operation.

Users can still select another file or edit the
textarea while a read is pending.

## Limitations

The 5 MiB limit is an application policy, not an
official n8n file-size requirement.

File contents are decoded as UTF-8.

Files using unsupported encodings may need conversion.

The import process loads the entire file into memory.

Large valid workflows may still take time to parse
and audit synchronously.

The implementation does not verify a JSON file's
structure before loading it into the textarea.

It does not provide physical read cancellation.

The automated tests cover the reader and coordination
logic; native file-picker interactions must be
verified manually.

## Testing

Automated tests verify:

- Filename validation
- Uppercase JSON extensions
- File-size boundaries
- Empty and whitespace-only files
- Reading failures
- Safe error messages
- Exact text preservation
- Latest-selection behavior
- Manual-edit invalidation
- Repeated selection
- Initial React file-input markup
- Preservation of the existing form

Manual browser testing verifies file selection,
loading, errors, editing, and subsequent auditing.

## Acceptance criteria

Step 4.4 can be closed when:

- All 26 new tests pass.
- All previous 319 tests continue passing.
- TypeScript and Vite build successfully.
- Oxlint reports zero errors and warnings.
- Prettier checks pass.
- The manual browser scenarios pass.
- R01-R10, the core audit facade, the form reducer,
  and the findings component remain unchanged.
