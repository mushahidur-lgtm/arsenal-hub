# Features and capabilities

[Wiki home](../README.md) · [Project overview](project-overview.md) · [User guide](user-guide.md)

"Implemented" means verified in the source. "Partial" means it works with a stated gap. Nothing planned is listed here; see the [Roadmap](roadmap.md).

## Feature matrix

| Feature | Description | Status | Implementation |
|---|---|---|---|
| Match hero | Countdown to the next match; live score and key events while in play; result and talking points for 8 hours after kick-off | Implemented (live modes tested on replayed data only) | `src/components/matches.jsx`, `src/lib/hero.js` |
| Home tabs | Today, Transfers, Fixtures, Table via `#/?tab=` | Implemented | `src/App.jsx`, `src/lib/route.js` |
| Daily briefing | Top stories of the last two days, ranked | Implemented | `src/lib/news.js` (`pickBriefing`) |
| News de-duplication | Groups articles about one event | Implemented (heuristic) | `src/lib/news.js` |
| Source credibility | Official, Journalist, Reliable, Secondary, Opinion labels | Implemented | `src/lib/sources.js`, `src/lib/news.js` |
| News filters and search | Category, sort, source, player, text | Implemented | `src/components/news.jsx` |
| Saved articles | Bookmarks on this device | Implemented | `src/lib/storage.js` |
| Fixtures and results | Men's and women's, with competition filter | Implemented | `src/components/matches.jsx`, `src/lib/parsers.js` |
| Match detail | Report, events, team statistics, lineups, related news | Implemented when ESPN publishes the data | `src/components/matches.jsx`, `src/components/pitch.jsx` |
| Fan predictions | Local prediction before a match, compared afterwards | Implemented | `src/components/pitch.jsx` |
| League tables | Premier League and Women's Super League, with gaps to 2nd and the top four | Implemented | `src/lib/standings.js` |
| Squad centre | Men's and women's squads with position and status filters | Implemented | `src/components/squad.jsx` |
| Availability | Injured, Doubtful, Suspended, No injury reported, Unknown | Implemented (limited by ESPN's data) | `src/lib/availability.js` |
| Player profile | Season statistics, status, facts, photo, related news | Partial: statistics and photos depend on the provider | `src/components/squad.jsx`, `src/lib/playerstats.js` |
| Player comparison | Same season and competition, bars and radar | Implemented | `src/components/analysis.jsx` |
| Transfer tracker | Status, direction, timeline, fee and contract only when reported | Implemented (heuristic) | `src/lib/transfers.js`, `src/components/transfers.jsx` |
| Transfer watchlist | Flags status changes and new reports | Implemented | `src/lib/storage.js` (`useWatchlist`) |
| History | Timeline, Invincibles, records, managers | Implemented (static, dated cut-offs) | `src/lib/history.js` |
| Unified search | News, players, transfers, matches, history | Implemented | `src/App.jsx` (`SearchOverlay`) |
| Followed players, recent pages | Local personalisation | Implemented | `src/lib/storage.js` |
| Dark mode | Toggle, defaults to the system preference | Implemented | `src/App.jsx`, `src/index.css` |
| Offline-ish caching | Last good data shown with its age | Implemented (not a service worker; the app itself needs a connection to load) | `src/lib/data.js` |
| Diagnostics | `afcDiagnostics()` in the browser console | Implemented | `src/lib/net.js`, `src/lib/diagnostics.js` |

## What does not exist

Accounts, push notifications, a service worker, ticketing, video, a live audio or video stream, minutes played, xG/xA player statistics, and an official Arsenal.com feed.
