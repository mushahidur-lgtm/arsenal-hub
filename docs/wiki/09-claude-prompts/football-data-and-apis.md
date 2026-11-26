# Claude prompts: Football data and APIs

[Prompt index](README.md) · [Wiki home](../README.md)

Provider evaluation, resilience and validation. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Evaluate football API providers](#evaluate-football-api-providers)
- [Integrate a new API](#integrate-a-new-api)
- [Compare data providers' accuracy](#compare-data-providers-accuracy)
- [Improve caching](#improve-caching)
- [Validate API response data](#validate-api-response-data)
- [Handle outages and rate limits](#handle-outages-and-rate-limits)

## Evaluate football API providers

**When to use:** Considering a new data source.

```text
ROLE
You are an API analyst.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Compare providers for <DATA NEEDED>.

SCOPE
Research only.

FILES AND AREAS TO INSPECT
- docs/wiki/04-data-and-integrations/

DETAILED REQUIREMENTS
- For each: coverage, women's team support, price, terms, rate limits, CORS, key handling
- Cite official documentation with access date; mark unverified points

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
- Comparison table and recommendation
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- No capability claimed without a source
```

## Integrate a new API

**When to use:** After choosing a provider.

```text
ROLE
You are an integrations engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Integrate <API>.

SCOPE
Data layer and the consuming view.

FILES AND AREAS TO INSPECT
- data.js, net.js, parsers.js, validate.js

DETAILED REQUIREMENTS
- Validate responses; classify errors; add recorded fixtures

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
- Integration and tests
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Provider failure does not affect other sections
```

## Compare data providers' accuracy

**When to use:** Checking one source against another.

```text
ROLE
You are a data quality analyst.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Compare <PROVIDER A> and <PROVIDER B> for <DATA>.

SCOPE
Sampled real responses.

FILES AND AREAS TO INSPECT
- Parsers and data models

DETAILED REQUIREMENTS
- Compare the same matches or players
- Record mismatches with timestamps

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
- Mismatch report
- Evidence (file and line) for every finding
- What was not examined

ACCEPTANCE CRITERIA
- Sample and method are stated
```

## Improve caching

**When to use:** Too many requests or stale data.

```text
ROLE
You are a performance and caching engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve caching for <SOURCE>.

SCOPE
net.js and data.js.

FILES AND AREAS TO INSPECT
- caching-and-refresh doc
- diagnostics

DETAILED REQUIREMENTS
- Measure requests before and after
- Never trade away freshness of live match data

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
- Change with measurements
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Refresh still reaches the network
```

## Validate API response data

**When to use:** Hardening a parser.

```text
ROLE
You are a defensive programmer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Harden validation for <PARSER>.

SCOPE
One parser.

FILES AND AREAS TO INSPECT
- parsers.js or feeds.js, validate.js, validation.test.js

DETAILED REQUIREMENTS
- Wrong structure errors; bad records skipped and counted; missing stays null

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
- Tests for malformed input
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No crash on any malformed input tried
```

## Handle outages and rate limits

**When to use:** Providers failing or throttling.

```text
ROLE
You are a reliability engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve behaviour when <PROVIDER> is down or returns 429.

SCOPE
Request layer and UI states.

FILES AND AREAS TO INSPECT
- net.js, resilience.spec.js

DETAILED REQUIREMENTS
- No retry loops; respect Retry-After; keep cached data labelled

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
- Change and failure tests
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Bounded request count while failing
```
