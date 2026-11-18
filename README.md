# Arsenal Hub

A daily Arsenal platform built with React 18, Tailwind CSS v4 and lucide-react on Vite. No accounts, no paid APIs, no backend, nothing hardcoded except a clearly labelled curated history section.

- **News intelligence:** de-duplicated stories with source credibility tiers, player and topic filters, a five-item daily briefing, saved articles.
- **Squad centre:** men's and women's first teams kept separate, player profiles with season and competition statistics, availability with source and date.
- **Analysis:** two-player comparison with bars and a radar, limited to statistics the data provider actually supplies.
- **Transfers:** statuses from wording and outlet reliability, a verified reporting timeline, dismissed rumours, and a local watchlist with change detection.
- **Match Centre:** fixtures, results, tables, report, interactive pitch with ESPN's published formation, and local fan predictions.
- **History:** curated timeline, the Invincibles season, records and eras.

Live site: **https://mushahidur-lgtm.github.io/arsenal-hub/**

```
src/
├── App.jsx                 shell: hash routing, header, bottom nav + More sheet, unified search, homepage
├── components/
│   ├── ui.jsx              primitives (panels, chips, skeletons, error boundary)
│   ├── news.jsx            story cards, featured story, briefing, News page
│   ├── matches.jsx         next-match hero, Match Centre (men/women), match detail
│   ├── pitch.jsx           lineup pitch, match report, fan predictions
│   ├── squad.jsx           squad centre, availability, player profile
│   ├── analysis.jsx        player comparison
│   ├── transfers.jsx       tracker, timeline, watchlist
│   └── history.jsx         timeline, Invincibles, records, eras
└── lib/
    ├── data.js             fetching (shared in-flight requests + 30s memo), ESPN parsers, loaders, cache, useHubData
    ├── playerstats.js      per-player season stats and photo lookup
    ├── news.js / transfers.js / sources.js / feeds.js   pure news + transfer logic and feed parsing
    ├── pitch.js            lineup → pitch layout (pure)
    ├── history.js          curated history data (static, cut-offs stated)
    ├── storage.js          local preferences, bookmarks, followed players, watchlist, predictions, recents
    └── format.js           dates/times in the viewer's timezone
```

Routes (hash-based, so refreshing any of them works on GitHub Pages): `#/`, `#/news`, `#/matches`, `#/matches?team=women`, `#/matches/<event-id>`, `#/transfers`, `#/squad`, `#/squad?team=women`, `#/squad/player/<id>`, `#/analysis?a=<id>&b=<id>`, `#/history`, `#/history/invincibles|records|eras`.

---

## Deploy to GitHub Pages

Prerequisites: Node 20+, Git, and (optionally) the [GitHub CLI](https://cli.github.com/), logged in with `gh auth login`.

### 1. Install and build locally

```bash
cd arsenal-hub
npm install
npm run build
npm run preview    # open http://localhost:4173/arsenal-hub/
```

### 2. Create the repo and push

```bash
git init -b main
git add .
git commit -m "Initial commit: Arsenal FC Live Hub"
```

**Option A, GitHub CLI.** Create the public repo without pushing yet, so Pages can be enabled before the first workflow run:

```bash
gh repo create arsenal-hub --public --source=. --remote=origin
```

**Option B, manual.** Create an empty public repo named `arsenal-hub` at https://github.com/new (no README, .gitignore or license), then:

```bash
git remote add origin https://github.com/mushahidur-lgtm/arsenal-hub.git
```

### 3. Enable GitHub Pages (source: GitHub Actions)

CLI:

```bash
gh api -X POST repos/mushahidur-lgtm/arsenal-hub/pages -f build_type=workflow
```

Or in the browser: **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 4. Push. The workflow builds and deploys automatically.

```bash
git push -u origin main
gh run watch
```

The public URL is:

```bash
gh api repos/mushahidur-lgtm/arsenal-hub/pages --jq .html_url
```

→ `https://mushahidur-lgtm.github.io/arsenal-hub/`

If you pushed before enabling Pages, the first run fails at "Configure Pages". Enable Pages, then re-run it:

```bash
gh workflow run deploy.yml
```

Every later `git push` to `main` redeploys.

> **Renaming the repo?** Update `base` in `vite.config.js` to `"/<new-name>/"`, or assets will 404.

---

## Data sources (keyless)

| Section | Endpoint |
|---|---|
| Fixtures / results | ESPN `soccer/all/teams/<id>/schedule` (+ `?fixture=true`); men 359, women 19973 |
| Match detail | ESPN `soccer/<league>/summary?event=<id>` (lineups, formation, events, team stats, leaders, recap) |
| Squad + availability | ESPN `<league>/teams/<id>/roster` |
| Player statistics | ESPN `athletes/<id>/stats?team=&league=` (seasons and competitions are read from the response's own filters) |
| Player photo | Wikipedia REST summary, only when the article is a footballer whose birth year matches; credited on the page |
| Tables | ESPN standings (men's and women's leagues) |
| Transfer target details | ESPN search + athlete profile (exact single-name matches only) |
| News | RSS: BBC Sport, Sky Sports, The Athletic, The Guardian, football.london, Arseblog, r/Gunners; ESPN news API |

### What the data does not provide
ESPN's free player data has no minutes, xG/xA, key passes, tackles or interceptions, so comparison and profiles never show or estimate them (and no per-90 rates). It marks no captain, gives no injury return dates and no destination clubs for departures. Arsenal.com has no public feed. Each of these is stated in the UI where it would otherwise be expected.

### Reliability
- One request layer (`fetchJSON`) shares identical in-flight requests and reuses results for 30s; the Refresh button clears that memo.
- Each source loads independently, is cached locally, and shows its last-fetched time. A failure keeps old data on screen with a warning.
- The women's team data is loaded only when needed.
- A page-level error boundary keeps one broken view from blanking the app.

### Personal data (this device only)
Preferences and filters, saved articles, followed players, the transfer watchlist, fan predictions and recent pages are stored in `localStorage`. Nothing is sent anywhere.

