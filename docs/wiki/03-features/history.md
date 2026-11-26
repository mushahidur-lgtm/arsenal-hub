# History and records

[Wiki home](../README.md) · [Other features](other-features.md)

## Purpose and experience

`#/history` is a **curated, static** reference, clearly labelled as such in the app.

## Functionality

| Tab | Route | Content |
|---|---|---|
| Timeline | `#/history` | Events with category chips and a decade selector |
| The Invincibles | `#/history/invincibles` | The 2003–04 season: record, key players, matches |
| Records & honours | `#/history/records` | Records and trophy lists with their cut-offs |
| Managers & eras | `#/history/eras` | Eras |

## Data, state, errors

All content is in [`src/lib/history.js`](../../../src/lib/history.js). No network, so no loading or error states. The category filter is saved as `prefs.historyCat`. History entries also appear in search (`searchHistory`).

## Maintaining it

Every list states a cut-off ("As of 2024" and similar). When updating, change the figure **and** the stated cut-off, and verify against a primary source such as <https://www.arsenal.com/history>.

## Source files

[`history.jsx`](../../../src/components/history.jsx) (lazy-loaded) · [`history.js`](../../../src/lib/history.js)

## Limitations and opportunities

- Not updated automatically; can go out of date.
- The accuracy of each historical figure was not re-verified while writing this wiki.
- Opportunity: more seasons, per-entry source links.
