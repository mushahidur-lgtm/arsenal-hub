# Configuration reference

[Wiki home](../README.md) · [Environment configuration](../06-deployment-and-operations/environment-configuration.md)

All values are in code; there are no configuration files for runtime behaviour.

## Application

| Setting | Value | Where |
|---|---|---|
| Base path | `/arsenal-hub/` | `vite.config.js` |
| Team ids | men `359`, women `19973` | `sources.js`, `data.js` |
| Overall request budget | 5000 ms | `OVERALL_TIMEOUT_MS`, `net.js` |
| Response cache size, TTLs | 100; see [Caching](../04-data-and-integrations/caching-and-refresh.md) | `config`, `net.js` |
| Retry | 502/503/504, 250 ms | `net.js` |
| Circuit breaker | 2 failures, 5 min | `net.js` |
| Proxy-first | 10 min | `net.js` |
| Rate-limit cooldown | 30 s default, 120 s max | `net.js` |
| Feed deadline | 8 s | `loadFeeds`, `data.js` |
| Persistent cache | 1.5 MB, 3 days | `cacheConfig`, `data.js` |
| Auto refresh / match poll | 10 min / 60 s | `data.js` |
| Stale label after | 2 min | `ui.jsx` |
| Full-time hero window | 8 h from kick-off | `hero.js` |
| Unconfirmed after | 3.5 h from kick-off | `hero.js` |
| News archive | 21 days, 400 items | `storage.js` |
| Statistics / photo / lookup caches | 6 h, 40 / 30 d, 150 / 7 d, 200 | `playerstats.js`, `data.js` |

## Browser storage keys

`afc-cache-v2`, `afc-news-archive-v1`, `afc-saved-v1`, `afc-players-v1`, `afc-watchlist-v1`, `afc-predictions-v1`, `afc-recents-v1`, `afc-prefs-v1`, `afc-theme`, `afc-pstats-v1`, `afc-photos-v1`, `afc-player-lookup-v2`.

## Preference fields (`afc-prefs-v1`)

`homeCategory`, `newsCategory`, `newsSort`, `newsSources`, `newsPlayer`, `matchComp`, `squadPos`, `squadAvail`, `compareComp`, `historyCat`, `transferFilters`.

## npm scripts

| Script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:e2e` | `playwright test` |
| `test:e2e:chromium` | `playwright test --project=chromium` |
| `record-fixtures` | `node tests/e2e/record-fixtures.mjs` |
