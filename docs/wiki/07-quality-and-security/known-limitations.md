# Known limitations

[Wiki home](../README.md) · [Roadmap](../01-overview/roadmap.md) · [Security](security.md)

## Data providers

- Free endpoints without guarantees; ESPN's are not a documented public API as far as this repository shows.
- rss2json rate limits; public CORS proxies are slow and unreliable.
- The ESPN team summary cannot be fetched directly from the browser.
- No minutes, xG/xA, passing or defensive statistics; no return dates; no captain; no Arsenal.com feed.

## Behaviour

- Not a live stream; in-play data is re-checked every minute.
- News grouping, categories and transfer statuses are heuristics.
- Injury lists may be empty even when the club has reported an absence.
- The persistent cache evicts by save time.
- Personal data does not sync and has no export.
- Search is substring-based.
- Social previews are identical for every route.

## Verification gaps

- Live and full-time modes not observed on a real match day.
- Real Safari and real mobile devices not tested.
- History figures not re-verified.

## Repository and process

- No linter, type checks, coverage or error monitoring.
- No staging environment, version tags or changelog.
- Documentation in Markdown is scanned by Tailwind and can change the generated CSS.
