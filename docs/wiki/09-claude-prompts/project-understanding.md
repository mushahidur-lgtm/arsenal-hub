# Claude prompts: Project understanding

[Prompt index](README.md) · [Wiki home](../README.md)

Prompts that explain the codebase without changing it. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Understand the full architecture](#understand-the-full-architecture)
- [Explain an unfamiliar component](#explain-an-unfamiliar-component)
- [Trace a feature from UI to API](#trace-a-feature-from-ui-to-api)
- [Analyse the impact of a proposed change](#analyse-the-impact-of-a-proposed-change)

## Understand the full architecture

**When to use:** Starting on the project.

```text
ROLE
You are a senior front-end architect onboarding onto an unfamiliar codebase.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Explain how the application is put together, from page load to rendered UI.

SCOPE
Whole repository.

FILES AND AREAS TO INSPECT
- src/, vite.config.js, .github/workflows/, docs/wiki/02-architecture/

DETAILED REQUIREMENTS
- Describe layers, state, routing, data loading, caching and deployment
- Draw Mermaid diagrams that match the code
- List where the documentation disagrees with the code

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
- Architecture summary with diagrams
- List of documentation mismatches
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Every claim cites a file
- Nothing described that is not in the code
```

## Explain an unfamiliar component

**When to use:** Before editing a component you do not know.

```text
ROLE
You are a patient senior React developer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Explain the component <NAME> so I can change it safely.

SCOPE
The component, its callers and its data.

FILES AND AREAS TO INSPECT
- The file that defines <NAME>
- Its imports and callers
- Related tests

DETAILED REQUIREMENTS
- Explain props, state, effects and rendered states (loading, error, empty, stale)
- Point out risky parts and hidden coupling

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
- Plain-language walkthrough
- Safe-change checklist
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Callers and tests are listed
```

## Trace a feature from UI to API

**When to use:** Debugging or extending a feature.

```text
ROLE
You are a data-flow analyst.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Trace <FEATURE> from what the user sees back to the provider request.

SCOPE
One feature.

FILES AND AREAS TO INSPECT
- src/components/, src/lib/data.js, net.js, parsers.js, feeds.js

DETAILED REQUIREMENTS
- Show each transformation step with file and function
- State where it is cached and how it fails

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
- Step-by-step trace and a sequence diagram
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- The trace reaches an exact URL
```

## Analyse the impact of a proposed change

**When to use:** Before agreeing to a change.

```text
ROLE
You are a cautious tech lead.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Assess the impact of this proposed change: <DESCRIBE>.

SCOPE
Everything the change could touch.

FILES AND AREAS TO INSPECT
- Callers, tests, localStorage shapes, routes, workflows

DETAILED REQUIREMENTS
- List affected files, behaviour and data
- Identify migration needs and rollback
- Recommend an approach and its size

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
- Impact report and recommendation
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Breaking changes are called out explicitly
```
