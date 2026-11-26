# Claude prompts: Bug fixing

[Prompt index](README.md) · [Wiki home](../README.md)

Investigation and repair prompts. Reproduce first. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Investigate a production bug](#investigate-a-production-bug)
- [Diagnose an API failure](#diagnose-an-api-failure)
- [Fix a rendering issue](#fix-a-rendering-issue)
- [Fix a responsive layout problem](#fix-a-responsive-layout-problem)
- [Investigate incorrect football data](#investigate-incorrect-football-data)
- [Fix a routing problem](#fix-a-routing-problem)

## Investigate a production bug

**When to use:** Something is wrong on the live site.

```text
ROLE
You are a production debugger.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find the root cause of: <SYMPTOM, STEPS, BROWSER, TIME>.

SCOPE
The affected flow.

FILES AND AREAS TO INSPECT
- Related components and lib modules
- recent commits

DETAILED REQUIREMENTS
- Reproduce before fixing
- Distinguish local build from the deployed version
- Fix the cause, not the symptom

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
- Reproduction, root cause, fix, regression test
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- A test fails without the fix and passes with it
```

## Diagnose an API failure

**When to use:** A section shows 'Couldn't load'.

```text
ROLE
You are an integrations engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Diagnose why <SOURCE> fails.

SCOPE
That provider and the request layer.

FILES AND AREAS TO INSPECT
- src/lib/net.js, data.js, the parser
- docs/wiki/04-data-and-integrations/

DETAILED REQUIREMENTS
- Classify: CORS, HTTP status, rate limit, timeout or changed response shape
- Use afcDiagnostics() output if I provide it
- Capture a real response before changing a parser

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
- Diagnosis and fix
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Failure path still shows an honest error
```

## Fix a rendering issue

**When to use:** Something renders wrongly or crashes.

```text
ROLE
You are a React specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Fix: <DESCRIPTION OR SCREENSHOT>.

SCOPE
The affected components.

FILES AND AREAS TO INSPECT
- The component, ui.jsx, index.css

DETAILED REQUIREMENTS
- Check light, dark, loading and missing-data states

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
- Fix and before/after screenshots
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No console errors
```

## Fix a responsive layout problem

**When to use:** Layout breaks at some width.

```text
ROLE
You are a mobile-first CSS engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Fix layout at <WIDTH> on <PAGE>.

SCOPE
That page.

FILES AND AREAS TO INSPECT
- The component
- tests/e2e/responsive.spec.js

DETAILED REQUIREMENTS
- Verify 320, 375, 768, 1024, 1280 and 1920px
- Keep 44px touch targets

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
- Fix and screenshots
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No horizontal overflow at any tested width
```

## Investigate incorrect football data

**When to use:** A score, status or statistic looks wrong.

```text
ROLE
You are a football data analyst.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Explain and correct: <WHAT IS SHOWN vs WHAT IS EXPECTED, WITH SOURCE>.

SCOPE
Parser and display logic.

FILES AND AREAS TO INSPECT
- parsers.js, hero.js, availability.js, transfers.js, news.js

DETAILED REQUIREMENTS
- First determine whether the provider's data is wrong or our handling is
- Never override provider data with hand-written values

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
- Verdict with evidence, and fix if ours
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Unknown values remain shown as unknown
```

## Fix a routing problem

**When to use:** A link or refresh lands in the wrong place.

```text
ROLE
You are a front-end routing engineer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Fix: <URL AND BEHAVIOUR>.

SCOPE
Hash routing.

FILES AND AREAS TO INSPECT
- src/lib/route.js, App.jsx, tests/unit/route.test.js

DETAILED REQUIREMENTS
- Keep existing routes and legacy ids working

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
- Fix and tests
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Direct load and refresh both work
```
