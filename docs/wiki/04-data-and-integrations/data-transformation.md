# Data transformation

[Wiki home](../README.md) · [Data flow](../02-architecture/data-flow.md) · [Data models](data-models.md)

## Validation rules

[`src/lib/validate.js`](../../../src/lib/validate.js):

1. Wrong overall structure → `FetchError` of kind `data`: the section shows an error with Retry.
2. One bad record → skipped and counted in diagnostics.
3. Missing or malformed field → `null` or empty. Never 0, never a guess. Blank strings are not zero.

## Transformations

| Input | Function | Output and notable rules |
|---|---|---|
| Schedule responses | `parseSchedules` | Merged by event id; events without a valid date or two teams dropped; postponed finished matches are not results |
| Roster | `parseRoster` | Sorted by line then shirt number; availability attached |
| Standings | `parseStandings` | Sorted by rank |
| Match summary | `parseSummary` | Only statistics both teams have; substitution names read from event text |
| rss2json / XML / ESPN news | `parseRss2Json`, `parseRssXml`, `parseEspnNews` | HTML stripped, entities decoded, items without title or link dropped; r/Gunners link posts unwrapped to the real article |
| rss2json dates | `parseDate` | `YYYY-MM-DD HH:mm:ss` is read as UTC |
| Articles | `buildStories` | See [News](../03-features/news-and-content.md) |
| Stories | `buildTransfers` | See [Transfers](../03-features/transfers.md) |
| Athlete statistics | `parsePlayerStats`, `seasonLine` | See [Statistics](../03-features/statistics.md) |
| Lineup | `layoutLineup`, `pitchPoints` | Rows from the formation, else by position depth |

## Dates and timezones

Times are stored as `Date` objects and formatted in the viewer's timezone by [`format.js`](../../../src/lib/format.js). Dates restored from `localStorage` are revived for known keys (`date`, `updated`, `savedAt`, `dob`).
