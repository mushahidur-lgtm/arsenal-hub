# Routing and navigation

[Wiki home](../README.md) · [User guide](../01-overview/user-guide.md) · [GitHub Pages](../06-deployment-and-operations/github-pages.md)

## How it works

Routing is hash-based, so the server only ever serves `index.html` and every deep link survives a refresh. `parseHash` in [`src/lib/route.js`](../../../src/lib/route.js) returns `{ page, parts, query }`; `useRoute` in `src/App.jsx` listens for `hashchange`.

- Invalid percent-encoding is kept as raw text rather than throwing.
- Unknown pages fall back to Home.
- Old ids `overview`, `fixtures`, `stats` redirect to `home` or `matches`.
- The window scrolls to the top only when the page or path changes, not when only the query changes.

## Routes

| Hash | Page |
|---|---|
| `#/` | Home (Today) |
| `#/?tab=transfers` `#/?tab=fixtures` `#/?tab=table` | Home tabs |
| `#/news` | News; `?cat=<id>` and `?q=<text>` pre-set filters |
| `#/matches` | Match centre; `?team=women` |
| `#/matches/<eventId>` | Match detail |
| `#/transfers` | Transfer tracker |
| `#/squad` | Squad; `?team=women` |
| `#/squad/player/<id>` | Player profile; `?team=women` |
| `#/analysis?a=<id>&b=<id>` | Comparison; `&team=women` |
| `#/history` | Timeline |
| `#/history/invincibles` `#/history/records` `#/history/eras` | History tabs |

## Navigation components

- **Header** (all widths): logo, desktop links from 1024px, search, refresh, theme.
- **BottomNav** (below 1024px): five primary links and a **More** menu (Analysis, History). Escape closes the menu and returns focus.
- **SearchOverlay**: opens with the button or `/`; traps Tab; Escape closes; Enter goes to News search.
- Active links carry `aria-current="page"`.

## Adding a route

Add the page id to `PAGES` in `route.js`, add it to `NAV` and `TITLES` and the `switch` in `App.jsx`, then add tests in `tests/unit/route.test.js` and a journey. See [Adding a feature](../05-development/adding-a-feature.md).
