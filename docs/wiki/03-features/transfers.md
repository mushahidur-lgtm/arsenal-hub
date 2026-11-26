# Transfer tracker

[Wiki home](../README.md) · [News](news-and-content.md)

## Contents

- [Purpose and experience](#purpose-and-experience)
- [Functionality](#functionality)
- [Status rules](#status-rules)
- [Components, data and state](#components-data-and-state)
- [Loading and errors](#loading-and-errors)
- [Source files](#source-files)
- [Limitations and opportunities](#limitations-and-opportunities)

## Purpose and experience

`#/transfers` turns news reports into a tracker that is deliberately cautious. There is no transfer API: everything comes from the news feeds.

## Functionality

Activity overview and window information (typical months only, never exact dates); tabs All, Incoming, Outgoing, Renewals, Window news, Watchlist; filters by status, position and source reliability; per-entry timeline of reports with outlet, date and link; fee and contract length only when a report states them; **Watch** with "Mark as seen" for changes.

## Status rules

[`src/lib/transfers.js`](../../../src/lib/transfers.js):

| Status | Meaning |
|---|---|
| Speculation, Monitoring, Interest reported | Early wording |
| Strongly reported | Bids or talks |
| Advanced talks | Agreement-type wording |
| Reported complete | Completion from a single reliable source |
| Confirmed | Official club item, or two independent reliable or journalist outlets |
| Dismissed | Latest report is a denial and completion was never reached |

Hedged wording lowers certainty; fan opinion is capped at the lowest level and secondary outlets at "Interest". The stepper maps statuses to Rumour, Talks, Agreed, Complete.

A player card is built only for a current squad member, or when an ESPN search returns exactly one footballer with the same name. Otherwise the story stays a story.

## Components, data and state

`TransfersPage`, `TransferWatch`, `Stepper`, `StatusBadge`. Data: stories, roster, `lookupPlayers` (cached 7 days). Preferences `transferFilters`; watchlist `afc-watchlist-v1`.

## Loading and errors

Skeletons while news loads; "Couldn't load transfer reports" with Retry; honest empty states.

## Source files

[`transfers.js`](../../../src/lib/transfers.js) · [`transfers.jsx`](../../../src/components/transfers.jsx) · `lookupPlayers` in [`data.js`](../../../src/lib/data.js)

## Limitations and opportunities

- Wording-based classification can misread headlines.
- Only reports seen by this device in the last 21 days are counted.
- Incoming targets without a unique search hit get no player card; departures show no destination club.
- Rumoured targets show initials, not photos, to avoid showing a namesake.
