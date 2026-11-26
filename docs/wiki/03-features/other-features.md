# Other features

[Wiki home](../README.md)

## Contents

- [Unified search](#unified-search)
- [Personalisation](#personalisation)
- [Theme](#theme)
- [Refresh and freshness](#refresh-and-freshness)
- [Sharing preview](#sharing-preview)
- [Diagnostics](#diagnostics)

## Unified search

- **Experience:** button or `/`. Results from two characters: up to 5 news, 5 players (both squads), 4 transfers, 5 matches, and history entries.
- **How:** every search word must appear. Opening search loads the women's roster and schedule once. Enter goes to News search.
- **Errors:** it searches only what is loaded; "No results for …" when empty.
- **Source:** `SearchOverlay` in [`App.jsx`](../../../src/App.jsx).
- **Limitation:** plain substring matching, no ranking across groups or accent folding for this overlay.

## Personalisation

| Item | Key | Hook |
|---|---|---|
| Saved articles | `afc-saved-v1` | `useBookmarks` |
| Followed players | `afc-players-v1` | `useSavedPlayers` |
| Transfer watchlist | `afc-watchlist-v1` | `useWatchlist` |
| Match predictions | `afc-predictions-v1` | `usePredictions` |
| Recently visited (max 12) | `afc-recents-v1` | `useRecents` |
| Filters and tabs | `afc-prefs-v1` | `usePersistentState` |

All in [`storage.js`](../../../src/lib/storage.js). Corrupted or blocked storage falls back to defaults. Nothing leaves the device. There is no export or sync.

## Theme

Light or dark, saved as `afc-theme`; without a saved value it follows the system setting. The `theme-color` meta tag follows too.

## Refresh and freshness

The header button refreshes all active sources; the app also refreshes every 10 minutes while visible and on returning to the tab. The header line shows how old the data is. See [Caching and refresh](../04-data-and-integrations/caching-and-refresh.md).

## Sharing preview

`index.html` has Open Graph and Twitter card tags using `public/og-image.png`, a branded card with no live data. The tags are static, so every shared route shows the same preview.

## Diagnostics

Run `afcDiagnostics()` in the browser console. See [Troubleshooting](../05-development/troubleshooting.md).
