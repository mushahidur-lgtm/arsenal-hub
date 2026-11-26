# Component architecture

[Wiki home](../README.md) · [Design system](design-system.md) · [Routing](routing-and-navigation.md)

## Component hierarchy

```mermaid
flowchart TD
  App["App"] --> Header["Header + Freshness"]
  App --> Boundary["ErrorBoundary > Suspense"]
  App --> BottomNav["BottomNav, below 1024px"]
  App --> Search["SearchOverlay"]
  Boundary --> Home["HomePage"]
  Boundary --> NewsPage["NewsPage"]
  Boundary --> MC["MatchCentrePage"]
  Boundary --> MD["MatchDetailPage"]
  Boundary --> TP["TransfersPage"]
  Boundary --> SP["SquadPage"]
  Boundary --> PP["PlayerProfilePage"]
  Boundary --> CP["ComparePage, lazy"]
  Boundary --> HP["HistoryPage, lazy"]
  Home --> Hero["NextMatchHero > MatchdayHero, TalkingPoints"]
  Home --> Glance["AtAGlance"]
  Home --> Featured["FeaturedStory, BriefingList, StoryRow, FanTalk"]
  Home --> TW["TransferWatch > Stepper"]
  Home --> Lists["MatchList, StandingsTable"]
  Home --> Hub["InjuryLine, YourHub"]
  MD --> Pitch["MatchReport, LineupPanel, PredictionBox, all lazy"]
  SP --> Squad["AvailabilityOverview, AvailabilityList, TopPerformers"]
```

## Shared primitives (`src/components/ui.jsx`)

| Component | Use |
|---|---|
| `Panel`, `SectionHead` | Card surface and section title |
| `Chips`, `Select` | Filter tabs and labelled dropdowns |
| `SourceGate` | Chooses skeleton, error or content for a data source, and adds `StaleBanner` |
| `StaleBanner` | Age of cached data, or "Refresh failed" |
| `ErrorState`, `SectionError`, `EmptyState` | Failure and empty states |
| `Skel`, `SkeletonRows` | Loading placeholders |
| `Crest`, `Thumb`, `ArsenalMark` | Images with fallbacks |
| `ResultPill`, `CompBadge` | Result (W square, D circle, L diamond) and competition badge |
| `ErrorBoundary` | Keeps one broken page from blanking the app |
| `useNow`, `cx` | Clock hook (30s) and class joiner |

## Conventions

- Data state is a "source" object: `{ status, data, error, warnings, savedAt }`. Pass it to `SourceGate` rather than re-implementing loading and error handling.
- Pages receive data as props; only match detail, hero summary and player statistics fetch their own, and they subscribe to `useRefreshEpoch`.
- Cross-component imports exist (for example `PlayerAvatar` from `squad.jsx`, `TierBadge` from `news.jsx`). Reuse them.
