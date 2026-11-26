# Data models

[Wiki home](../README.md) · [Data transformation](data-transformation.md)

The project is plain JavaScript, so these shapes are conventions produced by the parsers, not declared types. `null` means unknown.

## Contents

- [Source](#source)
- [Match](#match)
- [Player](#player)
- [Standings row](#standings-row)
- [Article and story](#article-and-story)
- [Transfer entry](#transfer-entry)
- [Match summary](#match-summary)
- [Player statistics](#player-statistics)

## Source

`{ status: "idle"|"loading"|"cached"|"refreshing"|"ok"|"error", data, error, warnings[], savedAt }`

## Match

From `parseEvent`: `id, date (Date), leagueSlug, competition, compShort, friendly, venue, city, state ("pre"|"in"|"post"), completed, statusDetail, clock, postponed, isHome, home, away, ars, opp, result ("W"|"D"|"L"|null)`.
Each side: `id, name, short, abbr, logo, homeAway, score, shootout`.
`parseSchedules` returns `{ results (newest first), fixtures (soonest first), dropped }`.

## Player

From `parseRoster`: `id, name, shortName, lastName, jersey, position, group ("Goalkeepers"|"Defenders"|"Midfielders"|"Forwards"|"Other"), age, nationality, dob, birthPlace, height, weight, season, flag, photo, link, availability, stats`.
`availability`: `{ key: "injured"|"doubtful"|"suspended"|"clear"|"unknown", label, detail?, source, updated }`.

## Standings row

`id, name, short, abbr, logo, rank, gp, w, d, l, gf, ga, gd, pts, note { color, label }`. Missing columns are `undefined`.

## Article and story

Raw feed item: `id, title, link, date, updated, image, excerpt, author, outlet, source, scope ("arsenal"|"league"|"ucl"), video?, discussion?`.
Enriched article adds: `tier, journalist, cites[], summary, categories (Set), primary, concepts, titleConcepts, tokens, entities, players (Set), canonical`.
Story: `id, lead, articles[], outlets[], independent[], cited[], date, firstDate, categories, primary, tier, summary, image, imageCredit, scope, score`.

## Transfer entry

`id, direction ("incoming"|"outgoing"|"renewal"|"general"), status, player {name, position, age, club, photo, dob, inSquad, link} | null, subject, fee {text, source} | null, contract {text, source} | null, story, headline, articles[], outlets[], independent[], reliableOutlets[], updated, related[]`.

## Match summary

`status, clock, stats[] {key, label, home, away, fmt, teamIds}, lineups[] {teamId, team, formation, starters[], subs[]}, events[] {id, kind, minute, teamId, primary, secondary, text}, leaders[], recap, attendance, referee, venue`.

## Player statistics

`{ competitions: [{slug, name}], data: { [slug]: { [season]: { _year, [ABBR]: number } } }, labels, fetchedAt }`. Absent keys mean the provider gave no value.
