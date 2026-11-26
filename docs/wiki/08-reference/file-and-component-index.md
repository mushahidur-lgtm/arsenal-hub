# File and component index

[Wiki home](../README.md) · [Project structure](../05-development/project-structure.md)

## Contents

- [Shell](#shell)
- [Components](#components)
- [Library](#library)
- [Configuration and tests](#configuration-and-tests)

## Shell

| File | Contains |
|---|---|
| [`src/main.jsx`](../../../src/main.jsx) | Root render |
| [`src/App.jsx`](../../../src/App.jsx) | `App`, `useRoute`, `useDarkMode`, `useIntelligence`, `Header`, `BottomNav`, `SearchOverlay`, `HomePage`, `AtAGlance`, `InjuryLine`, `YourHub` |
| [`src/index.css`](../../../src/index.css) | Theme tokens and utilities |

## Components

| File | Main exports |
|---|---|
| [`ui.jsx`](../../../src/components/ui.jsx) | `ErrorBoundary`, `Panel`, `SectionHead`, `SourceGate`, `StaleBanner`, `ErrorState`, `SectionError`, `EmptyState`, `Skel`, `SkeletonRows`, `Chips`, `Select`, `Crest`, `Thumb`, `ResultPill`, `CompBadge`, `useNow` |
| [`news.jsx`](../../../src/components/news.jsx) | `NewsPage`, `StoryRow`, `FeaturedStory`, `BriefingList`, `FanTalk`, `TierBadge` |
| [`matches.jsx`](../../../src/components/matches.jsx) | `MatchCentrePage`, `MatchDetailPage`, `NextMatchHero`, `TalkingPoints`, `MatchList`, `StandingsTable`, `SeasonStats`, `FormStrip`, `Countdown` |
| [`pitch.jsx`](../../../src/components/pitch.jsx) | `LineupPanel`, `MatchReport`, `PredictionBox` |
| [`squad.jsx`](../../../src/components/squad.jsx) | `SquadPage`, `PlayerProfilePage`, `PlayerAvatar`, `AvailabilityList`, `TopPerformers`, `TeamSwitch`, `usePlayerStats` |
| [`analysis.jsx`](../../../src/components/analysis.jsx) | `ComparePage` |
| [`transfers.jsx`](../../../src/components/transfers.jsx) | `TransfersPage`, `TransferWatch`, `Stepper`, `StatusBadge` |
| [`history.jsx`](../../../src/components/history.jsx) | `HistoryPage` |

## Library

| File | Responsibility and key exports |
|---|---|
| [`data.js`](../../../src/lib/data.js) | `URLS`, `LOADERS`, `fetchFeed`, `fetchMatchSummary`, `lookupPlayers`, `readCache`, `writeCache`, `useHubData` |
| [`net.js`](../../../src/lib/net.js) | `fetchJSON`, `clearMemo`, `PROXIES`, `configureNet`, `getNetDiagnostics` |
| [`cache.js`](../../../src/lib/cache.js) | `LruCache` |
| [`errors.js`](../../../src/lib/errors.js) | `FetchError` |
| [`diagnostics.js`](../../../src/lib/diagnostics.js) | Counters |
| [`validate.js`](../../../src/lib/validate.js) | `num`, `str`, `date`, `expectObject`, `expectArray`, `keepValid` |
| [`parsers.js`](../../../src/lib/parsers.js) | ESPN parsers |
| [`feeds.js`](../../../src/lib/feeds.js) | RSS and ESPN news parsers |
| [`sources.js`](../../../src/lib/sources.js) | Outlets, tiers, journalists |
| [`news.js`](../../../src/lib/news.js) | Enrichment, clustering, ranking |
| [`transfers.js`](../../../src/lib/transfers.js) | Statuses, entries, stepper |
| [`playerstats.js`](../../../src/lib/playerstats.js) | Statistics, bio, photo |
| [`availability.js`](../../../src/lib/availability.js) | Availability states |
| [`hero.js`](../../../src/lib/hero.js) | Match phase and match-day logic |
| [`standings.js`](../../../src/lib/standings.js) | `tableGaps` |
| [`pitch.js`](../../../src/lib/pitch.js) | Lineup layout |
| [`history.js`](../../../src/lib/history.js) | Static history data |
| [`route.js`](../../../src/lib/route.js) | `parseHash`, `PAGES` |
| [`format.js`](../../../src/lib/format.js) | Dates and numbers |
| [`storage.js`](../../../src/lib/storage.js) | Persistence hooks and archive |
| [`refresh.js`](../../../src/lib/refresh.js) | Refresh signal |
| [`lazy.js`](../../../src/lib/lazy.js) | `lazyRetry`, `isChunkError` |

## Configuration and tests

`vite.config.js`, `vitest.config.js`, `playwright.config.js`, `playwright.audit.config.js`, `.github/workflows/`, `tests/` (see [Testing](../05-development/testing.md)).
