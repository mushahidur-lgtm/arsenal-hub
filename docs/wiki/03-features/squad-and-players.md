# Squad and players

[Wiki home](../README.md) · [Statistics and comparison](statistics.md)

## Contents

- [Purpose and experience](#purpose-and-experience)
- [Functionality](#functionality)
- [Availability rules](#availability-rules)
- [Components, data and state](#components-data-and-state)
- [Loading and errors](#loading-and-errors)
- [Source files](#source-files)
- [Limitations and opportunities](#limitations-and-opportunities)

## Purpose and experience

`#/squad` shows the first-team squad (men's or women's, kept separate). `#/squad/player/<id>` is a profile.

## Functionality

**Squad:** availability counts, position chips and status chips (saved in preferences), player cards with a follow star, "Injuries & doubts", "Injury news", "Top performers" (men's and women's season totals from the roster feed).

**Profile:** header, season statistics by competition and season, status with its source and report date, profile facts, national-team history when available, related news, follow button.

## Availability rules

[`src/lib/availability.js`](../../../src/lib/availability.js):

| State | When |
|---|---|
| Injured | A readable injury record, or a player status mentioning injury |
| Doubtful | Record says questionable, doubtful, day-to-day or probable |
| Suspended | Record, flag or status mentions suspension |
| No injury reported | The provider sent an **empty** injury list |
| Unknown | No injury list at all, or a record that cannot be read |

With several records, suspension outranks injury, which outranks a doubt. Nothing is ever labelled "Available".

## Components, data and state

- Components: `SquadPage`, `PlayerProfilePage`, `AvailabilityOverview`, `AvailabilityList`, `TopPerformers`, `TeamSwitch`, `PlayerAvatar`, `SaveStar`.
- Data: roster (ESPN), athlete stats and bio (ESPN), photo (Wikipedia summary), news stories that mention the player.
- State: followed players in `afc-players-v1`; filters in `prefs.squadPos` and `prefs.squadAvail` (an older saved value `available` is read as "None reported").
- Photos: ESPN's headshot when present; otherwise a Wikipedia thumbnail only if the article describes a footballer and the birth year matches when known. Otherwise initials.

## Loading and errors

Skeleton cards; "Couldn't load the squad" with Retry; "Player not found" for unknown ids; statistics have their own error state. A roster response without an `athletes` list is an error, not an empty squad.

## Source files

[`squad.jsx`](../../../src/components/squad.jsx) · [`availability.js`](../../../src/lib/availability.js) · [`playerstats.js`](../../../src/lib/playerstats.js) · [`parsers.js`](../../../src/lib/parsers.js) (`parseRoster`)

## Limitations and opportunities

- ESPN's injury data can be empty or late; no return dates are shown.
- No captain marker.
- A player with no position from the provider appears under "Other".
- Opportunity: in-page name search; richer statistics if a provider supplies them.
