# League and standings

[Wiki home](../README.md) · [Fixtures and results](fixtures-and-results.md)

## Purpose and experience

Shows where Arsenal stand in the Premier League (men) or Women's Super League (women), on Home's **Table** tab, the **At a glance** card and the match centre.

## Functionality

- Compact view of five rows around Arsenal, with a "Full table" toggle (Home's Table tab shows the full table).
- Arsenal's row is highlighted (`aria-current`).
- Qualification and relegation colour marks from the provider, with a key in the full view.
- **Gap summary:** points versus 2nd place, and versus the top-four line (the cushion over 5th if inside, the deficit to 4th if outside).

## How it works

`parseStandings` validates the response and maps provider statistics (`rank`, `gamesPlayed`, `wins`, `ties`, `losses`, `pointsFor`, `pointsAgainst`, `pointDifferential`, `points`). `tableGaps` (`src/lib/standings.js`) does the arithmetic; values it cannot compute are `null` and hidden.

## Components, data, state

`StandingsTable`, `GapSummary` (`matches.jsx`), `AtAGlance` (`App.jsx`). Data: sources `standings`, `womenStandings`. The only state is the local full-table toggle.

## Loading and errors

`SourceGate`: skeleton, "Couldn't load" with Retry, stale label.

## Source files

[`standings.js`](../../../src/lib/standings.js) · [`parsers.js`](../../../src/lib/parsers.js) · [`matches.jsx`](../../../src/components/matches.jsx)

## Limitations and opportunities

- Only the domestic league tables; no Champions League table.
- The table is the provider's; the app does not recalculate it.
- The "top four" line is fixed in code and does not follow changes to qualification places.
