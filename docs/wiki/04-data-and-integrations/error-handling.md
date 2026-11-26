# Error handling and logging

[Wiki home](../README.md) · [Troubleshooting](../05-development/troubleshooting.md)

## Error kinds

`FetchError.kind` ([`errors.js`](../../../src/lib/errors.js)):

| Kind | Meaning | Reaction |
|---|---|---|
| network | Never completed (offline, DNS, CORS) | Try proxies |
| offline | Browser reports no connection | Fail at once |
| timeout | No answer in time | No proxy |
| http | Error status | Retry only 502/503/504 |
| ratelimit | 429 or cooling down | Back off |
| data | Invalid JSON or wrong structure | No proxy |

## What the user sees

| Situation | UI |
|---|---|
| First load | Skeleton |
| Failed, nothing cached | "Couldn't load … / Retry" |
| Failed, cached data | Data plus "Refresh failed. Last updated …" |
| Some feeds failed | Content from the rest, with feed status |
| Nothing to show | Explanatory empty state |
| Code error in a page | Error boundary: "This page hit a problem" |
| Chunk download failed | "This part of the site couldn't be loaded / Reload page" |

## Isolation

Each source loads independently with `Promise.allSettled` where several are combined. The team summary is optional and never counts as a failure. Corrupted `localStorage` values fall back to defaults.

## Logging and monitoring

There is **no** remote logging or error monitoring. `afcDiagnostics()` in the console returns cache statistics, per-provider counts and last errors, a log of the last 50 proxy fallbacks, dropped-record counts, cooldowns and proxy-first hosts. Counters are in memory and reset on reload.
