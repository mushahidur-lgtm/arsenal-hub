# Claude prompts: Security audit

[Prompt index](README.md) · [Wiki home](../README.md)

Report separately: verified findings and recommendations. Do not suppress alerts or weaken controls. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Review dependencies](#review-dependencies)
- [Audit API integrations](#audit-api-integrations)
- [Review secret management](#review-secret-management)
- [Identify exposed sensitive information](#identify-exposed-sensitive-information)
- [Review client-side security](#review-client-side-security)
- [Assess third-party integrations](#assess-third-party-integrations)

## Review dependencies

**When to use:** Regular dependency check.

```text
ROLE
You are an application security engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Assess dependency risk.

SCOPE
package.json and lock file.

FILES AND AREAS TO INSPECT
- npm audit, npm outdated

DETAILED REQUIREMENTS
- Separate runtime from development-only risk

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
- Findings and upgrade plan
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Each finding cites an advisory
```

## Audit API integrations

**When to use:** Reviewing data intake.

```text
ROLE
You are a security reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Check how untrusted provider data is handled.

SCOPE
net.js, parsers, feeds, rendering.

FILES AND AREAS TO INSPECT
- feeds.js (link schemes), components rendering links and images

DETAILED REQUIREMENTS
- Look for script-capable URLs, injection and unsafe assumptions

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
- Findings
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Each has an attack scenario
```

## Review secret management

**When to use:** Checking for leaks.

```text
ROLE
You are a secrets auditor.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find secrets or sensitive data in the repository and history.

SCOPE
All tracked files, history, workflows.

FILES AND AREAS TO INSPECT
- git log, .github/, public/, root files

DETAILED REQUIREMENTS
- Never print a secret value; give file and type only
- Recommend rotation where relevant

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
- Findings
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- History is included
```

## Identify exposed sensitive information

**When to use:** Before publishing changes.

```text
ROLE
You are a privacy reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find personal data in the repository or built site.

SCOPE
Repository and dist/.

FILES AND AREAS TO INSPECT
- root files, fixtures, docs, screenshots

DETAILED REQUIREMENTS
- Report type and location without repeating the data

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
- Findings
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Fixtures and docs are covered
```

## Review client-side security

**When to use:** Browser hardening.

```text
ROLE
You are a web security engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Review XSS, CSP, link and storage handling.

SCOPE
Client code and index.html.

FILES AND AREAS TO INSPECT
- src/, index.html

DETAILED REQUIREMENTS
- Propose a CSP and note what it could break

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
- Findings and proposal
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Verified and recommended items separated
```

## Assess third-party integrations

**When to use:** Reviewing external services.

```text
ROLE
You are a supply-chain reviewer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Assess each third party the site contacts.

SCOPE
All external hosts.

FILES AND AREAS TO INSPECT
- sources.js, data.js, net.js, index.html, workflows

DETAILED REQUIREMENTS
- State what data each receives and what happens if it is compromised

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
- Table and recommendations
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Includes public CORS proxies and GitHub Actions
```
