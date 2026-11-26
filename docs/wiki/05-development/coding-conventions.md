# Coding conventions

[Wiki home](../README.md) · [Code quality](../07-quality-and-security/code-quality.md)

Observed in the codebase. No linter or formatter enforces them.

- ES modules; function components and hooks; double quotes; semicolons; two-space indent.
- Imports include the file extension (`./lib/data.js`).
- Pure logic goes in `src/lib/` and takes `now` as a parameter where time matters, so it can be tested.
- Components use Tailwind semantic utilities; join classes with `cx`.
- Comments explain **why**; module headers describe responsibilities.
- Data rules: unknown is `null` and shown as unknown; never invent or zero-fill.
- Every `localStorage` access is guarded; keys are prefixed `afc-`. Do not rename existing keys without a migration.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- Requests go through `fetchJSON`; parsers validate their input.
- Line endings: files are checked out with CRLF on Windows; Git may print LF/CRLF warnings.
