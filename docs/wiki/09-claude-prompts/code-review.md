# Claude prompts: Code review

[Prompt index](README.md) · [Wiki home](../README.md)

Review prompts. All are read-only. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Review the entire repository](#review-the-entire-repository)
- [Review one component](#review-one-component)
- [Find code smells and duplication](#find-code-smells-and-duplication)
- [Identify architectural problems](#identify-architectural-problems)

## Review the entire repository

**When to use:** Periodic health check.

```text
ROLE
You are a rigorous code reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find real defects and maintainability problems, ranked by severity.

SCOPE
All of src/, tests and configuration.

FILES AND AREAS TO INSPECT
- src/
- tests/
- vite.config.js
- .github/workflows/

DETAILED REQUIREMENTS
- Separate defects from style opinions
- Give a concrete failing scenario for each defect

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).
- Read-only: report findings; change nothing.

TESTING REQUIREMENTS
This is a read-only task: do not modify files. You may run `npm test` and `npm run build` to support findings; report their output.

EXPECTED DELIVERABLES
- Ranked findings
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Each defect is reproducible from the description
```

## Review one component

**When to use:** Reviewing a specific file.

```text
ROLE
You are a React reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Review <FILE> for correctness, accessibility and clarity.

SCOPE
One file and its direct dependencies.

FILES AND AREAS TO INSPECT
- <FILE>
- its tests

DETAILED REQUIREMENTS
- Check hooks dependencies, cleanup, keys, states and unknown values

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).
- Read-only: report findings; change nothing.

TESTING REQUIREMENTS
This is a read-only task: do not modify files. You may run `npm test` and `npm run build` to support findings; report their output.

EXPECTED DELIVERABLES
- Findings with line numbers
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- No speculative findings presented as facts
```

## Find code smells and duplication

**When to use:** Planning a clean-up.

```text
ROLE
You are a maintainability specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Identify code smells and duplicated logic.

SCOPE
src/.

FILES AND AREAS TO INSPECT
- src/App.jsx and src/components/matches.jsx (large files)
- src/lib/

DETAILED REQUIREMENTS
- List duplicates with both locations
- Estimate effort and risk of removing each

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).
- Read-only: report findings; change nothing.

TESTING REQUIREMENTS
This is a read-only task: do not modify files. You may run `npm test` and `npm run build` to support findings; report their output.

EXPECTED DELIVERABLES
- Prioritised list
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Every duplicate cites two places
```

## Identify architectural problems

**When to use:** Before a larger investment.

```text
ROLE
You are a software architect.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Assess module boundaries, coupling and state ownership.

SCOPE
src/.

FILES AND AREAS TO INSPECT
- Import graph
- state hooks
- data layer

DETAILED REQUIREMENTS
- Show coupling between page modules
- Propose incremental improvements only

CONSTRAINTS
- Inspect the existing code before changing anything.
- Reuse the existing architecture, components and utilities where practical.
- Avoid unnecessary dependencies; ask before adding one.
- Do not introduce breaking changes (routes, localStorage keys, data shapes, branding, the unofficial-fan-site disclaimer) without my approval.
- Do not hardcode or expose secrets.
- Do not invent API capabilities, statistics, results or news; verify against real responses and label anything unverified.
- Do not remove existing functionality.
- Do not commit, push, merge or deploy without my explicit approval (a push to main is a production release).
- Read-only: report findings; change nothing.

TESTING REQUIREMENTS
This is a read-only task: do not modify files. You may run `npm test` and `npm run build` to support findings; report their output.

EXPECTED DELIVERABLES
- Assessment and staged plan
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- No rewrite proposed without strong justification
```
