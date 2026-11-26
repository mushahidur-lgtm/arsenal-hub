# Claude prompts: Release readiness

[Prompt index](README.md) · [Wiki home](../README.md)

End-to-end checks before shipping. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Full pre-release audit](#full-pre-release-audit)
- [Validate all major features](#validate-all-major-features)
- [Review outstanding bugs](#review-outstanding-bugs)
- [Check documentation completeness](#check-documentation-completeness)
- [Produce a release-readiness report](#produce-a-release-readiness-report)

## Full pre-release audit

**When to use:** Before a significant release.

```text
ROLE
You are a release manager.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Decide whether the current branch is ready.

SCOPE
Everything.

FILES AND AREAS TO INSPECT
- tests, build, workflows, docs

DETAILED REQUIREMENTS
- Run all checks; state exactly what ran

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
- Go or no-go with reasons
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- No claim without evidence
```

## Validate all major features

**When to use:** Feature sign-off.

```text
ROLE
You are a QA lead.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Verify each feature in the feature matrix.

SCOPE
All features.

FILES AND AREAS TO INSPECT
- docs/wiki/01-overview/features-and-capabilities.md

DETAILED REQUIREMENTS
- Mark pass, fail or not testable with how it was checked

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
- Feature checklist
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Every matrix row is covered
```

## Review outstanding bugs

**When to use:** Prioritising before release.

```text
ROLE
You are a triage lead.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
List and prioritise known problems.

SCOPE
Issues, limitations, TODOs.

FILES AND AREAS TO INSPECT
- known-limitations doc, GitHub issues if accessible, code comments

DETAILED REQUIREMENTS
- Classify blocker or deferrable

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
- Triage list
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Blockers are justified
```

## Check documentation completeness

**When to use:** Docs drift.

```text
ROLE
You are a documentation reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Compare the wiki with the code and list gaps.

SCOPE
docs/wiki/ and README.md.

FILES AND AREAS TO INSPECT
- scripts, routes, endpoints, storage keys, limits

DETAILED REQUIREMENTS
- Check links and commands

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
- Mismatch list
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Each mismatch cites doc and code
```

## Produce a release-readiness report

**When to use:** Final summary for approval.

```text
ROLE
You are a release manager.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Write the report for <VERSION OR BRANCH>.

SCOPE
Results of the checks above.

FILES AND AREAS TO INSPECT
- test output, diffs, CI runs

DETAILED REQUIREMENTS
- Separate local from CI from production verification

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
- Report with summary, results, risks, rollback
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- A reader can decide without reading code
```
