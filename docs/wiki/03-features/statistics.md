# Statistics and player comparison

[Wiki home](../README.md) · [Squad and players](squad-and-players.md) · [Data models](../04-data-and-integrations/data-models.md)

## Purpose and experience

Season statistics on player profiles, and `#/analysis?a=<id>&b=<id>` to compare two players of the same squad.

## Functionality

- Pickers with name search and position filter.
- Competition and season selectors; only seasons **both** players have are offered.
- Metric rows for statistics both have, a radar of up to six, and three derived figures:

| Derived | Formula |
|---|---|
| Goals per start | `G ÷ STRT` (substitute appearances excluded) |
| Assists per start | `A ÷ STRT` |
| Shot accuracy | `SOG ÷ SHOT` as a percentage |

A derived value appears only when its denominator is above zero.

## How it works

1. `loadPlayerStats(id, teamId)` fetches the athlete's default league, reads the response's own league filter, and fetches each other competition (friendlies excluded).
2. `parsePlayerStats` keeps only finite numbers. A missing or non-numeric value stays **absent**; it is never 0.
3. Competitions with no recorded numbers are dropped.
4. `seasonLine` sums a season across the chosen competitions.

Also: season figures for the team ("Season so far") on the match centre and roster-based "Top performers" on the squad page.

## Components, data and state

`ComparePage` (lazy, `analysis.jsx`), `PlayerProfilePage`, `usePlayerStats` (`squad.jsx`). Statistics are cached on the device for 6 hours (up to 40 players, `afc-pstats-v1`); a data refresh while the page is open bypasses that cache. Competition choice is `prefs.compareComp`.

## Loading and errors

Skeletons; "Couldn't load player statistics" with retry; "No statistic is available for both players".

## Source files

[`analysis.jsx`](../../../src/components/analysis.jsx) · [`playerstats.js`](../../../src/lib/playerstats.js)

## Limitations and opportunities

- The free data has **no** minutes, xG/xA, key passes, tackles or interceptions, so there are no per-90 figures.
- Goalkeepers and outfield players share only some statistics.
- Opportunity: export or share a comparison; more charts if richer data becomes available.
