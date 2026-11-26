# Fixtures, results and match detail

[Wiki home](../README.md) · [Dashboard](dashboard.md) · [League and standings](league-and-standings.md)

## Contents

- [Purpose and experience](#purpose-and-experience)
- [Functionality](#functionality)
- [Match phases](#match-phases)
- [Components, data and state](#components-data-and-state)
- [Loading and errors](#loading-and-errors)
- [Source files](#source-files)
- [Limitations and opportunities](#limitations-and-opportunities)

## Purpose and experience

`#/matches` lists what is coming and what happened, for the men's or women's team. `#/matches/<id>` is the full page for one match.

## Functionality

**Match centre:** team switch, hero card, competition chips (saved as `prefs.matchComp`), Upcoming and Results lists ("Show more results"), "Season so far" figures, form strip, and the league table.

**Match page** (what appears depends on the match state and on what ESPN publishes):

- Score header with venue, date in your timezone and attendance
- Match report: ESPN's recap, goals, cards, standout performers, related coverage
- Key events, team statistic bars
- Lineups: Pitch or List view, switch teams, tap a player; substitutes
- **Your prediction** (before kick-off), stored locally and compared with the result afterwards

## Match phases

`matchPhase` in [`src/lib/hero.js`](../../../src/lib/hero.js):

| Phase | Rule |
|---|---|
| live | Provider state `in` |
| completed | Provider state `post` |
| postponed | Status text says postponed or cancelled |
| upcoming | Kick-off in the future |
| kickoff-passed | Kick-off within the last 3.5 hours, provider still says scheduled |
| unconfirmed | Longer ago than that: shown as **Awaiting result** and never as the next match |

A missing score is shown as a dash, never as 0.

## Components, data and state

- Components: `MatchCentrePage`, `MatchDetailPage`, `MatchRow`, `NextMatchHero` (`matches.jsx`); `MatchReport`, `LineupPanel`, `PredictionBox` (`pitch.jsx`, lazy).
- Data: ESPN team schedule (past events plus `?fixture=true`), ESPN match summary. The lineup layout is computed by `layoutLineup`/`pitchPoints` from the published formation; if it does not match the players, rows are grouped by position.
- State: predictions in `afc-predictions-v1`; competition filter in `afc-prefs-v1`.
- Refresh: the match page re-fetches when the app refreshes, and every 60s while the match is in play.

## Loading and errors

Skeletons while loading; "Couldn't load fixtures / match details" with Retry; "Match not found" for unknown ids. If the `all` competitions schedule fails, a league-only schedule is used and a warning says so.

## Source files

[`matches.jsx`](../../../src/components/matches.jsx) · [`pitch.jsx`](../../../src/components/pitch.jsx) · [`lib/pitch.js`](../../../src/lib/pitch.js) · [`lib/parsers.js`](../../../src/lib/parsers.js) (`parseSchedules`, `parseEvent`, `parseSummary`)

## Limitations and opportunities

- Not a live stream; the provider can lag the real match.
- Events without a valid kick-off time or two teams are skipped.
- Lineups, statistics and recaps are absent when ESPN does not publish them.
- No expected goals in team statistics from the free data.
- Opportunity: calendar export, richer live view.
