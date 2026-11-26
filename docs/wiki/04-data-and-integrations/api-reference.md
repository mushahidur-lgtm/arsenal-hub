# API reference

[Wiki home](../README.md) · [Data sources](data-sources.md) · [Data models](data-models.md)

Every request is an HTTP **GET** with **no authentication** and `cache: "no-store"`. Exact URLs are in `URLS` ([`data.js`](../../../src/lib/data.js)), `OUTLETS` ([`sources.js`](../../../src/lib/sources.js)) and `PROXIES` ([`net.js`](../../../src/lib/net.js)).

**Rate limits:** none of these providers' limits are documented in this repository (unverified). The code notes that rss2json rate-limits feeds it has not seen, per IP.

## Contents

- [ESPN](#espn)
- [rss2json and RSS](#rss2json-and-rss)
- [Wikipedia](#wikipedia)
- [CORS proxies](#cors-proxies)
- [Request behaviour](#request-behaviour)
- [Verified samples](#verified-samples)

## ESPN

Base A: `https://site.api.espn.com/apis/site/v2/sports/soccer`
Base B: `https://site.web.api.espn.com/apis`

| Purpose | URL | Parameters | Fields read | Parser |
|---|---|---|---|---|
| Schedule, all competitions | `A/all/teams/{teamId}/schedule` | `fixture=true` for upcoming | `events[]` | `parseSchedules` |
| Schedule, league fallback | `A/{eng.1 or eng.w.1}/teams/{teamId}/schedule` | same | same | same |
| Roster | `A/{league}/teams/{teamId}/roster` | | `athletes[]`, `season` | `parseRoster` |
| Team summary | `A/eng.1/teams/359` | | `team` | `parseTeam` |
| Standings | `B/v2/sports/soccer/{league}/standings` | | `children[0].standings.entries[]` | `parseStandings` |
| News | `A/eng.1/news`, `A/uefa.champions/news` | `team=359` for Arsenal | `articles[]` | `parseEspnNews` |
| Match summary | `A/{leagueSlug or all}/summary` | `event={id}` | `header`, `boxscore`, `rosters`, `keyEvents`, `leaders`, `article`, `gameInfo` | `parseSummary` |
| Athlete statistics | `B/common/v3/sports/soccer/athletes/{id}/stats` | `team`, optional `league` | `categories[]`, `filters[]` | `parsePlayerStats` |
| Athlete bio | `B/common/v3/sports/soccer/athletes/{id}/bio` | | `teamHistory[]` | `loadPlayerBio` |
| Athlete profile | `B/common/v3/sports/soccer/athletes/{id}` | | `athlete` | `lookupPlayers` |
| Search | `B/search/v2` | `query`, `limit=5` | `results[]` | `lookupPlayers` |

The team summary endpoint sends no CORS header (code comment), so on GitHub Pages it works only through a public proxy; it is optional.

## rss2json and RSS

- rss2json: `https://api.rss2json.com/v1/api.json?rss_url={encoded feed URL}`. Expects `status: "ok"` and `items[]`.
- Direct XML is used first for The Athletic (its host sends CORS headers), and as a fallback for the others.

| Outlet | Feed URL | Tier |
|---|---|---|
| BBC Sport | `https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml` | reliable |
| Sky Sports | `https://www.skysports.com/rss/11670` | reliable |
| The Athletic | `https://www.nytimes.com/athletic/rss/football/arsenal/` | reliable |
| The Guardian | `https://www.theguardian.com/football/arsenal/rss` | reliable |
| football.london | `https://www.football.london/arsenal-fc/?service=rss` | secondary |
| Arseblog | `https://www.arseblog.com/feed/` | opinion |
| r/Gunners | `https://www.reddit.com/r/Gunners/top/.rss?t=day` | opinion |

At most 25 raw XML items per feed are kept.

## Wikipedia

`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`, tried as the name and as `name (footballer)`. Used only for photos, when `type` is `standard`, the description mentions a footballer and a thumbnail exists.

## CORS proxies

Used only after a **network or CORS** failure of a direct request:

1. `/__proxy?url=…` (development server only; defined in `vite.config.js`, host allow-list, HTTPS only)
2. `https://api.allorigins.win/raw?url=…`
3. `https://api.codetabs.com/v1/proxy?quest=…`

The public proxies are third parties that see the requested URL and can alter responses.

## Request behaviour

| Aspect | Behaviour |
|---|---|
| Time budget | 5s overall per request, shared by the direct attempt and proxies; news feeds also have an 8s cap each |
| Retry | One retry after 250ms for HTTP 502, 503, 504 only |
| Rate limit | After 429, the host is not called until `Retry-After` (default 30s, at most 120s) |
| Proxy health | Skipped for 5 minutes after 2 consecutive failures |
| Proxy-first | A host that needed a proxy is tried proxy-first for 10 minutes |
| De-duplication | Identical in-flight requests are shared |
| Cache | See [Caching and refresh](caching-and-refresh.md) |

## Verified samples

Trimmed from responses recorded from the providers on 2026-11-18 (`tests/e2e/fixtures`). Real responses contain many more fields.

Schedule event:

```json
{"id":"401878760","date":"2026-11-07T15:00Z","league":{"slug":"eng.1"},
 "competitions":[{"status":{"type":{"state":"post","completed":true,"name":"STATUS_FULL_TIME","shortDetail":"FT"}},
  "venue":{"fullName":"Emirates Stadium"},
  "competitors":[
   {"homeAway":"home","score":{"value":1,"displayValue":"1"},"team":{"id":"359","displayName":"Arsenal","abbreviation":"ARS"}},
   {"homeAway":"away","score":{"value":0,"displayValue":"0"},"team":{"id":"306","displayName":"Hull City","abbreviation":"HUL"}}]}]}
```

Standings entry:

```json
{"team":{"id":"359","displayName":"Arsenal"},
 "stats":[{"name":"gamesPlayed","value":10,"displayValue":"10"},{"name":"points","value":27,"displayValue":"27"},{"name":"rank","value":1,"displayValue":"1"}]}
```

No rss2json sample is shown because none is recorded in the repository.
