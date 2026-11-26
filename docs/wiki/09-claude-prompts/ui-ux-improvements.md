# Claude prompts: UI and UX improvements

[Prompt index](README.md) · [Wiki home](../README.md)

Keep the existing Arsenal identity. Replace anything in `<ANGLE BRACKETS>` before use.

## Contents

- [Improve the dashboard](#improve-the-dashboard)
- [Improve mobile responsiveness](#improve-mobile-responsiveness)
- [Improve navigation](#improve-navigation)
- [Improve accessibility](#improve-accessibility)
- [Maintain consistent styling](#maintain-consistent-styling)
- [Improve data presentation](#improve-data-presentation)

## Improve the dashboard

**When to use:** Home feels cluttered or unclear.

```text
ROLE
You are a mobile UX designer who can code.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve Home for: <GOAL>.

SCOPE
Home only.

FILES AND AREAS TO INSPECT
- HomePage in App.jsx, hero components, docs/wiki/02-architecture/design-system.md

DETAILED REQUIREMENTS
- Propose two wireframe-level options and wait for my choice

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
- Options, then implementation
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Keeps all existing data reachable
```

## Improve mobile responsiveness

**When to use:** Phone experience problems.

```text
ROLE
You are a mobile web specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve small-screen use.

SCOPE
All pages at 320-430px.

FILES AND AREAS TO INSPECT
- responsive.spec.js
- bottom navigation

DETAILED REQUIREMENTS
- Check overflow, tap targets, tables and the pitch

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
- Fixes with screenshots
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No overflow; 44px targets
```

## Improve navigation

**When to use:** Users struggle to find things.

```text
ROLE
You are an information-architecture specialist.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Improve navigation for <PROBLEM>.

SCOPE
Header, bottom nav, More, search.

FILES AND AREAS TO INSPECT
- App.jsx, route.js

DETAILED REQUIREMENTS
- Do not change existing URLs without approval

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
- Proposal then change
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Back, forward and deep links still work
```

## Improve accessibility

**When to use:** Accessibility pass.

```text
ROLE
You are an accessibility engineer (WCAG 2.2 AA).

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Find and fix accessibility barriers.

SCOPE
All pages and overlays.

FILES AND AREAS TO INSPECT
- a11y.spec.js, ui.jsx

DETAILED REQUIREMENTS
- Test keyboard use manually as well as with axe
- State what automation cannot verify

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
- Findings and fixes
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- axe passes in light and dark
```

## Maintain consistent styling

**When to use:** Reviewing new UI.

```text
ROLE
You are a design-system guardian.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Check <CHANGE> against the design system and align it.

SCOPE
Changed components.

FILES AND AREAS TO INSPECT
- index.css, ui.jsx, design-system doc

DETAILED REQUIREMENTS
- Use semantic tokens and shared primitives

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
- Differences and fixes
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- No new hard-coded colours
```

## Improve data presentation

**When to use:** Tables or cards are hard to read.

```text
ROLE
You are an information designer.

PROJECT CONTEXT
Arsenal Hub is an unofficial Arsenal fan site (repository mushahidur-lgtm/arsenal-hub, live at https://mushahidur-lgtm.github.io/arsenal-hub/). React 18 + Vite + Tailwind CSS v4, plain JavaScript, hash routing, no backend, keyless public data (ESPN, RSS via rss2json, Wikipedia), GitHub Pages deployed from `main` by GitHub Actions. Read CLAUDE.md (if present) and docs/wiki/README.md first.

OBJECTIVE
Make <DATA VIEW> clearer.

SCOPE
One view.

FILES AND AREAS TO INSPECT
- The view and its data model

DETAILED REQUIREMENTS
- Show units, source and age where relevant

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
- Redesign of that view only
- Files changed and why (design decisions)
- Test and build results, quoting what actually ran
- Risks, limitations and anything not verified

ACCEPTANCE CRITERIA
- Works without colour perception
```
