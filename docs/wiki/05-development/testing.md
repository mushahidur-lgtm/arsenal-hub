# Testing

[Wiki home](../README.md) · [Local setup](local-setup.md) · [GitHub Actions](../06-deployment-and-operations/github-actions.md)

## Contents

- [Suites](#suites)
- [Unit tests](#unit-tests)
- [End-to-end tests](#end-to-end-tests)
- [Audits](#audits)
- [Writing tests](#writing-tests)

## Suites

| Command | Scope |
|---|---|
| `npm test` | Vitest, `tests/unit` (374 tests in 17 files at the documented commit) |
| `npm run test:e2e` | Playwright, Chromium, Firefox, WebKit (155 tests per browser) |
| `npm run test:e2e:chromium` | Chromium only |
| `npm run record-fixtures` | Re-record real provider responses (**needs network; overwrites fixtures**) |

No coverage tool is configured.

## Unit tests

jsdom environment, timezone pinned to UTC (some tests change `TZ` themselves), and an in-memory `localStorage` in `tests/unit/setup.js`. `fetch` is stubbed; time is faked where needed.

Covered: news grouping and credibility, transfers, parsers and validation, availability, network layer (retry, cooldown, circuit breaker, cache), persistent cache and the data hook, storage, routing, timezones, match phases, standings gaps, pitch layout, history.

## End-to-end tests

Playwright builds the app and serves it at `/arsenal-hub/` on port 4173. Every external host is replayed from `tests/e2e/fixtures`; the browser clock is fixed to the capture time; anything not replayed is blocked.

| Spec | Covers |
|---|---|
| `journeys.spec.js` | Main user journeys |
| `home.spec.js` | Home tabs, match-day hero, social tags |
| `review.spec.js` | Refresh, classification, More menu, deep links, chunk failures |
| `resilience.spec.js` | Failures, caching, request hygiene, diagnostics |
| `availability.spec.js` | Availability states |
| `responsive.spec.js` | Six viewport sizes |
| `a11y.spec.js` | axe scans, headings, keyboard, reduced motion |

`reuseExistingServer` is on outside CI: if something already listens on 4173, the tests use it, which may be a **stale build**.

## Audits

```bash
npx playwright test -c playwright.audit.config.js live
```

Set `AUDIT_BASE` to the site to check (it defaults to a local dev server). `visual.audit.js` saves screenshots to `AUDIT_OUT`. `live.audit.js` is a read-only smoke test using real data, so results can vary.

PowerShell example against production:

```powershell
$env:AUDIT_BASE="https://mushahidur-lgtm.github.io/arsenal-hub/"; npx playwright test -c playwright.audit.config.js live
```

## Writing tests

- Never call live providers from `tests/unit` or `tests/e2e`.
- Prefer behaviour over rendering checks.
- Do not add fabricated data to `src/`; test inputs live in tests.
- Avoid timing races: wait for a state, or gate a request.
