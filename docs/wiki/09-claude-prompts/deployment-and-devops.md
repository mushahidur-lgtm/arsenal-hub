# Claude prompts: Deployment and DevOps

[Prompt index](README.md) · [Wiki home](../README.md)

A push to main deploys; be careful. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Review GitHub Actions](#review-github-actions)
- [Diagnose a failed deployment](#diagnose-a-failed-deployment)
- [Improve GitHub Pages configuration](#improve-github-pages-configuration)
- [Validate a production build](#validate-a-production-build)
- [Review the release workflow](#review-the-release-workflow)

## Review GitHub Actions

**When to use:** Pipeline health check.

```text
ROLE
You are a CI/CD engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Review the workflows.

SCOPE
.github/workflows/.

FILES AND AREAS TO INSPECT
- ci.yml, deploy.yml

DETAILED REQUIREMENTS
- Check permissions, pinning, caching, gates and deprecation warnings

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
- Findings and proposed diff
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- No change applied without approval
```

## Diagnose a failed deployment

**When to use:** A deploy run failed.

```text
ROLE
You are a release engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find why run <URL> failed.

SCOPE
That run.

FILES AND AREAS TO INSPECT
- logs or annotations I provide, workflows, tests

DETAILED REQUIREMENTS
- Reproduce locally where possible; distinguish flaky from real

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
- Root cause and fix
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Gate is not weakened to pass
```

## Improve GitHub Pages configuration

**When to use:** Hosting improvements.

```text
ROLE
You are a static-hosting specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve: <GOAL>.

SCOPE
Base path, routing, assets.

FILES AND AREAS TO INSPECT
- vite.config.js, index.html, public/

DETAILED REQUIREMENTS
- Explain effects on existing links

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
- Deep links still work
```

## Validate a production build

**When to use:** Before releasing.

```text
ROLE
You are a build verifier.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Verify the production build.

SCOPE
dist/.

FILES AND AREAS TO INSPECT
- npm run build, npm run preview

DETAILED REQUIREMENTS
- Check base paths, missing assets, local URLs and secrets

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
- Checklist results
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Each item verified or marked not verified
```

## Review the release workflow

**When to use:** Process improvement.

```text
ROLE
You are a delivery lead.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve releasing and rollback.

SCOPE
Branching, tags, rollback.

FILES AND AREAS TO INSPECT
- release-process doc, workflows

DETAILED REQUIREMENTS
- Propose tags or a changelog if useful

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
- Proposal
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Rollback steps are concrete
```
