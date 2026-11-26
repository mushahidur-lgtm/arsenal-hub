# Adding a feature

[Wiki home](../README.md) · [Design system](../02-architecture/design-system.md) · [Prompt library](../09-claude-prompts/feature-development.md)

## Contents

- [Checklist](#checklist)
- [A new data source](#a-new-data-source)
- [A new page](#a-new-page)
- [Testing and release](#testing-and-release)

## Checklist

1. Confirm the data actually exists (call the endpoint, read a real response).
2. Put logic in `src/lib/` as pure functions with tests.
3. Reuse `Panel`, `SourceGate`, `Chips`, error and empty states.
4. Handle loading, error with Retry, empty and stale.
5. Show unknown values as unknown.
6. Check 375px and 1280px, light and dark, keyboard use.

## A new data source

1. Add the URL to `URLS` (or an outlet to `OUTLETS`).
2. Write a parser that calls `expectObject`/`expectArray` and skips bad records with `keepValid`.
3. Add a loader to `LOADERS` returning `{ data, warnings }`. Add it to `LAZY_SOURCES` or `OPTIONAL_SOURCES` if appropriate.
4. If the data has dates, check the cache revival keys and add a cache check if a bad value could crash the UI.
5. Add the host to `ALLOWED_HOSTS` in `vite.config.js` if the dev proxy must reach it.
6. Add a replay rule and recorded fixture in `tests/e2e/support.js` (unmatched hosts are blocked in tests).

## A new page

1. Add the id to `PAGES` (`route.js`).
2. Add it to `NAV`, `TITLES` and the `switch` in `App.jsx`.
3. Lazy-load rarely used pages with `lazyRetry`.
4. Give it one `h1`.
5. Add route and journey tests.

## Testing and release

Run `npm test`, `npm run build`, `npm run test:e2e`, then follow the [Release process](../06-deployment-and-operations/release-process.md).
