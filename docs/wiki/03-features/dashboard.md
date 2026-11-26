# Dashboard (Home)

[Wiki home](../README.md) · [Fixtures and results](fixtures-and-results.md) · [News](news-and-content.md)

## Contents

- [Purpose and experience](#purpose-and-experience)
- [Functionality and interactions](#functionality-and-interactions)
- [How it works](#how-it-works)
- [Components, data and state](#components-data-and-state)
- [Loading and errors](#loading-and-errors)
- [Source files](#source-files)
- [Limitations and opportunities](#limitations-and-opportunities)

## Purpose and experience

One screen that answers "what's happening with Arsenal today?". A hero card for the match, a league snapshot, then a sticky tab bar: **Today · Transfers · Fixtures · Table**.

## Functionality and interactions

| Tab | Contents |
|---|---|
| Today | Match-day build-up (only on match days), top story ("1 of N"), the other top stories, availability line, Latest with All/Match/Transfers/Injuries chips, Fan talk, Your hub |
| Transfers | Up to 8 entries with a Rumour → Talks → Agreed → Complete stepper; link to the full tracker |
| Fixtures | Next five fixtures and last five competitive results |
| Table | Full Premier League table with gaps to 2nd place and the top-four line |

Interactions: switch tabs (the URL becomes `#/?tab=…`), save articles, expand briefing items and outlet lists, filter Latest, open matches and players, clear recently visited.

## How it works

1. `heroMode(schedule)` decides: **live** (a match is in play), **fulltime** (a competitive match kicked off less than 8 hours ago and is finished) or **upcoming**.
2. Upcoming: `pickNextMatch` chooses the next fixture and skips fixtures whose status is stale.
3. Live and full time: the match summary is fetched for key events (every 60s while live). After full time, `talkingPoints` builds lines only from the summary's goals, statistics and cards.
4. `pickBriefing` ranks recent Arsenal stories, at most two per topic, excluding fan opinion; the first is the featured story.

## Components, data and state

- Components: `HomePage`, `AtAGlance`, `InjuryLine`, `YourHub` (`App.jsx`); `NextMatchHero`, `MatchList`, `StandingsTable` (`matches.jsx`); `FeaturedStory`, `BriefingList`, `StoryRow`, `FanTalk` (`news.jsx`); `TransferWatch` (`transfers.jsx`).
- Data: `schedule`, `standings`, `roster`, `arsenalNews`, `worldNews`; match summary (ESPN).
- State: tab from the URL; Latest filter in `prefs.homeCategory`; bookmarks, followed players and recents from `storage.js`.

## Loading and errors

Each block has its own skeleton, "Couldn't load … / Retry" state and stale label, so one failing source leaves the rest working. If match events cannot be loaded, the hero says so and still shows the score from the schedule.

## Source files

[`src/App.jsx`](../../../src/App.jsx) · [`src/components/matches.jsx`](../../../src/components/matches.jsx) · [`src/lib/hero.js`](../../../src/lib/hero.js) · [`src/lib/news.js`](../../../src/lib/news.js)

## Limitations and opportunities

- Live and full-time modes have been tested against re-timed recorded data, not a real live match.
- "Your hub" sits at the bottom of Today.
- A 30-second clock re-renders the page; its cost has not been measured.
- Opportunity: lineups preview in the hero; configurable tab order.
