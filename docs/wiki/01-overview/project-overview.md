# Project overview

[Wiki home](../README.md) · Next: [Features and capabilities](features-and-capabilities.md)

*Documented against commit `2cd40e2` (November 2026).*

## Contents

- [What it is](#what-it-is)
- [Objectives and users](#objectives-and-users)
- [Core capabilities](#core-capabilities)
- [Technology stack](#technology-stack)
- [Status](#status)
- [Links and deployment](#links-and-deployment)
- [Main limitations](#main-limitations)

## What it is

Arsenal Hub is an **unofficial** fan site about Arsenal's men's and women's teams. It is a client-only single-page application: there is no backend, no account system and no paid API. The browser fetches public data, processes it, and stores personal preferences in `localStorage`.

The site is not affiliated with Arsenal FC. That disclaimer appears in the page footer and must stay.

## Objectives and users

For an Arsenal supporter who wants a quick daily picture: the next match, what has happened, who is linked with the club, and who is available.

The code reflects these principles (see also [`CLAUDE.md`](../../../CLAUDE.md), the project instructions):

- Never fabricate statistics, results, transfers or news.
- Show what is unknown as unknown.
- One failing data source must not break the rest of the site.
- Attribute news and transfer reports to their source.

## Core capabilities

| Area | Summary |
|---|---|
| Home | Next, live or just-finished match, plus tabs for Today, Transfers, Fixtures and Table |
| News | De-duplicated stories with source credibility labels, filters and saved articles |
| Matches | Fixtures, results, league table, match detail with lineups, events and statistics |
| Transfers | Status tracker built from news wording and outlet reliability, with a local watchlist |
| Squad | Men's and women's squads, availability, player profiles |
| Analysis | Two-player comparison |
| History | Curated static timeline, records and eras |

Full matrix: [Features and capabilities](features-and-capabilities.md).

## Technology stack

| Layer | Choice | Version installed |
|---|---|---|
| UI | React, React DOM | 18.3.1 |
| Build | Vite, `@vitejs/plugin-react` | 6.4.6 / 4.7.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | 4.3.5 |
| Icons | lucide-react | 0.460.0 |
| Unit tests | Vitest, jsdom, Testing Library | 3.2.7 / 31.0.1 / 16.3.3 |
| Browser tests | Playwright, axe-core | 1.65.1 / 4.14.0 |
| Language | JavaScript and JSX (no TypeScript) | |
| Routing and state | Hand-written hash router and React hooks (no router or state library) | |
| Hosting | GitHub Pages via GitHub Actions | |

Details: [Dependencies](../08-reference/dependencies.md).

## Status

In production and actively maintained. At the documented commit: 374 unit tests pass, the production build succeeds, and the Playwright suite has 155 tests per browser project. There is **no linter and no type checker**.

## Links and deployment

- Live site: <https://mushahidur-lgtm.github.io/arsenal-hub/>
- Repository: <https://github.com/mushahidur-lgtm/arsenal-hub>
- Deployment: every push to `main` runs tests, builds and publishes to GitHub Pages. See [Deployment overview](../06-deployment-and-operations/deployment-overview.md).

## Main limitations

- Depends on free, undocumented or rate-limited third-party endpoints that can change without notice.
- No live match stream: in-play data is re-checked about once a minute.
- Personal data stays in one browser; nothing syncs between devices.

See [Known limitations](../07-quality-and-security/known-limitations.md).
