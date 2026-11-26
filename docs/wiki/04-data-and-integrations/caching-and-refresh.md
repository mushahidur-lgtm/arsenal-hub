# Caching and refresh

[Wiki home](../README.md) · [Error handling](error-handling.md)

## Contents

- [Layers](#layers)
- [Response cache](#response-cache)
- [Last good copy](#last-good-copy)
- [Other device caches](#other-device-caches)
- [When data refreshes](#when-data-refreshes)
- [Safety rules](#safety-rules)

## Layers

| Layer | Where | Purpose |
|---|---|---|
| Response cache | memory (`net.js`, `cache.js`) | Avoid repeat requests |
| Last good copy | `afc-cache-v2` | Show something immediately and when providers fail |
| Feature caches | `localStorage` | Statistics, photos, lookups, news archive |

There is no service worker; HTTP caching is bypassed for data requests.

## Response cache

LRU, at most 100 entries, TTL by category (from the URL):

| Category | TTL |
|---|---|
| live (schedule, summary) | 30s |
| news | 60s |
| roster, standings | 2 min |
| stats (athlete endpoints) | 5 min |
| default | 30s |

Change with `configureNet({ ttl, memoMax, … })`. Failures are never cached.

## Last good copy

One entry per source. Maximum age 3 days by default (`configureCache({ maxAgeMs })`). Size cap about 1.5 MB; the oldest-saved sources are evicted first (by save time, not last use). Cached schedules are re-checked for valid dates before use.

## Other device caches

| Key | Lifetime | Limit |
|---|---|---|
| `afc-pstats-v1` | 6h | 40 players |
| `afc-photos-v1` | 30 days (misses 7) | 150 |
| `afc-player-lookup-v2` | 7 days | 200 |
| `afc-news-archive-v1` | 21 days | 400 items |

## When data refreshes

- On page load (cached data shows first).
- Refresh button: clears the response cache and forces new requests.
- Every 10 minutes while the tab is visible, and on return to it.
- Every 60s for the schedule from 15 minutes before kick-off until 3 hours after, or while a match is in play.
- Match page, hero summary and open player statistics also re-fetch after a refresh (`refresh.js`).
- Women's data loads on first need.

## Safety rules

- A refresh starts a new request generation, so an older response cannot overwrite the cache.
- A forced load discards the result of an earlier, slower one.
- A failed refresh keeps previous data and shows "Refresh failed. Last updated …".
- Data older than two minutes shown during a refresh is labelled "Last updated …".
