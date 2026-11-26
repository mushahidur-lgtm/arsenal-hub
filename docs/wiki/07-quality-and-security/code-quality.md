# Code quality

[Wiki home](../README.md) · [Coding conventions](../05-development/coding-conventions.md)

## In place

- Unit and browser tests, run in CI and before deployment.
- Pure domain modules with explicit validation.
- A single request layer and shared UI primitives.

## Gaps

- No linter, formatter, type checker or coverage measurement.
- `App.jsx` and `matches.jsx` are large (700–800+ lines) and mix several concerns.
- Cross-imports between page modules couple them.
- Some `eslint-disable` comments remain although no ESLint runs.
- The root README's architecture section is out of date.

## Dependency management

Caret ranges in `package.json`, exact versions in `package-lock.json`, `npm ci` in CI. No automated update tool is configured. Newer major versions exist for several packages (see [Dependencies](../08-reference/dependencies.md)).
