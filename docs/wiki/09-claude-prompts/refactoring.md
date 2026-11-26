# Claude prompts: Refactoring

[Prompt index](README.md) · [Wiki home](../README.md)

Behaviour must not change. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Refactor a component](#refactor-a-component)
- [Improve type safety](#improve-type-safety)
- [Simplify state management](#simplify-state-management)
- [Reduce code duplication](#reduce-code-duplication)
- [Improve folder organisation](#improve-folder-organisation)

## Refactor a component

**When to use:** A file is hard to work in.

```text
ROLE
You are a refactoring specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Refactor <FILE> into clearer parts.

SCOPE
That file.

FILES AND AREAS TO INSPECT
- <FILE>, callers, tests

DETAILED REQUIREMENTS
- Add characterisation tests first
- Small steps

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).

TESTING REQUIREMENTS
Run `npm test`, `npm run build` and `npm run test:e2e:chromium` (full `npm run test:e2e` if browser behaviour may differ). Add tests for the behaviour you change. Tests must be deterministic and must not call live providers.

EXPECTED DELIVERABLES
- Refactor
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Same behaviour; all tests pass
```

## Improve type safety

**When to use:** Data shapes cause mistakes.

```text
ROLE
You are a TypeScript migration advisor.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
The project is plain JavaScript. Propose JSDoc typing or a TypeScript migration.

SCOPE
Data models first.

FILES AND AREAS TO INSPECT
- docs/wiki/04-data-and-integrations/data-models.md, src/lib/

DETAILED REQUIREMENTS
- Present options and costs; wait for approval before converting

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).

TESTING REQUIREMENTS
Run `npm test`, `npm run build` and `npm run test:e2e:chromium` (full `npm run test:e2e` if browser behaviour may differ). Add tests for the behaviour you change. Tests must be deterministic and must not call live providers.

EXPECTED DELIVERABLES
- Plan
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No build change without approval
```

## Simplify state management

**When to use:** State is hard to follow.

```text
ROLE
You are a React architect.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Simplify state flow in <AREA>.

SCOPE
App and hooks.

FILES AND AREAS TO INSPECT
- App.jsx, data.js, storage.js

DETAILED REQUIREMENTS
- Do not add a state library without approval; keep storage keys

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).

TESTING REQUIREMENTS
Run `npm test`, `npm run build` and `npm run test:e2e:chromium` (full `npm run test:e2e` if browser behaviour may differ). Add tests for the behaviour you change. Tests must be deterministic and must not call live providers.

EXPECTED DELIVERABLES
- Proposal and change
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Persistence unchanged
```

## Reduce code duplication

**When to use:** Repeated logic.

```text
ROLE
You are a maintainer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Remove duplication in <AREA>.

SCOPE
That area.

FILES AND AREAS TO INSPECT
- relevant modules

DETAILED REQUIREMENTS
- Only merge code that changes for the same reason

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).

TESTING REQUIREMENTS
Run `npm test`, `npm run build` and `npm run test:e2e:chromium` (full `npm run test:e2e` if browser behaviour may differ). Add tests for the behaviour you change. Tests must be deterministic and must not call live providers.

EXPECTED DELIVERABLES
- Change
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Fewer lines with equal behaviour
```

## Improve folder organisation

**When to use:** Files are hard to find.

```text
ROLE
You are a codebase organiser.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Propose a better folder structure.

SCOPE
src/ and tests/.

FILES AND AREAS TO INSPECT
- all imports, vite and test config

DETAILED REQUIREMENTS
- Show the move map first and wait for approval

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).

TESTING REQUIREMENTS
Run `npm test`, `npm run build` and `npm run test:e2e:chromium` (full `npm run test:e2e` if browser behaviour may differ). Add tests for the behaviour you change. Tests must be deterministic and must not call live providers.

EXPECTED DELIVERABLES
- Plan, then moves
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Build, tests and workflows still pass
```
