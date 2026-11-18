# Arsenal Hub

A daily Arsenal briefing built with React 18, Tailwind CSS v4 and lucide-react on Vite.
News is de-duplicated across outlets and labelled by source credibility, transfers are tracked from what outlets actually report,
and the Match Centre has fixtures, results, the table and per-match lineups, events and stats. No accounts, no paid APIs, nothing hardcoded.

Live site: **https://mushahidur-lgtm.github.io/arsenal-hub/**

```
arsenal-hub/
├── .github/workflows/deploy.yml   # build + deploy to GitHub Pages on push to main
├── src/
│   ├── App.jsx                    # shell: hash routing, header, mobile bottom nav, search, homepage
│   ├── components/
│   │   ├── ui.jsx                 # shared primitives (panels, chips, skeletons, error states)
│   │   ├── news.jsx               # story cards, featured story, News page, feed status
│   │   ├── matches.jsx            # next-match hero, fixtures/results, table, Match Centre, match detail
│   │   ├── transfers.jsx          # transfer tracker + homepage transfer watch
│   │   └── squad.jsx              # squad, availability, top performers
│   ├── lib/
│   │   ├── sources.js             # outlet registry + credibility tiers + journalists
│   │   ├── feeds.js               # RSS (rss2json or raw XML) and ESPN news parsing
│   │   ├── news.js                # categorise, de-duplicate, rank, pick the top story (pure, node-testable)
│   │   ├── transfers.js           # transfer direction/status extraction (pure, node-testable)
│   │   ├── data.js                # fetching, ESPN parsers, loaders, cache, useHubData
│   │   ├── storage.js             # localStorage prefs, bookmarks, news archive
│   │   └── format.js              # dates/times in the viewer's timezone
│   ├── main.jsx
│   └── index.css                  # theme tokens (light + dark), Tailwind
├── index.html
└── vite.config.js                 # base: "/arsenal-hub/" + dev-only CORS proxy
```

Routes (hash-based, so they work on GitHub Pages): `#/`, `#/news`, `#/news?cat=injury`, `#/news?q=saka`, `#/matches`, `#/matches/<espn-event-id>`, `#/transfers`, `#/squad`.

> **Tailwind v4 note:** Tailwind is wired in through the official `@tailwindcss/vite` plugin. There is no `postcss.config.js` and no `autoprefixer` dependency.

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
| Fixtures / results | ESPN `soccer/all/teams/359/schedule` (+ `?fixture=true`), falling back to `eng.1` |
| Match detail | ESPN `soccer/<league>/summary?event=<id>` (lineups, key events, team stats) |
| Squad + availability | ESPN `eng.1/teams/359/roster` |
| League table | ESPN `site.web.api.espn.com/.../eng.1/standings` |
| Transfer target details | ESPN search + athlete profile (only for an exact, single name match) |
| Arsenal news | RSS: BBC Sport, Sky Sports, The Athletic, The Guardian, football.london, Arseblog, r/Gunners; plus ESPN news API |
| League news | ESPN `eng.1/news`, `uefa.champions/news` |

Arsenal.com has no public RSS feed. Official items show up only when an article links straight to arsenal.com. To add a feed, set `feed` on the outlet in `src/lib/sources.js`.

### Credibility and de-duplication

- **Source tiers** (`sources.js`): Official, Established journalist (only when the byline names them), Reliable reporting, Secondary reporting, Fan opinion. Tiers describe the outlet, not whether a claim is true.
- **De-duplication** (`news.js`): two articles merge only when they share a subject (a squad player or a named person) **and** an event type (contract, injury, match, death…) in their headlines, published within 48–72h, or when their headlines are near-identical, or their canonical URLs match. A shared name alone never merges stories.
- **Independence**: an article that cites another outlet in the same story ("according to The Athletic") isn't counted as independent.
- **Transfer statuses** (`transfers.js`): based on wording *and* tier. Secondary outlets cap at "Interest reported"; hedged or quoted headlines are "Speculation"; "Confirmed" needs the club or two independent reliable outlets reporting completion.

Test the pure modules in node against saved feed JSON by importing `src/lib/news.js` / `src/lib/transfers.js` directly; they have no browser dependencies.

### Caching, refresh and failure handling

- Each source loads independently. The last good copy is kept in localStorage (`afc-cache-v2`), so the page paints instantly and is clearly marked "Showing saved data from …" until fresh data arrives.
- Arsenal news items are archived on the device for 21 days (`afc-news-archive-v1`), so the transfer tracker and search see more than a feed's last 10 items.
- Data refreshes every 10 minutes while the tab is visible. On matchday the schedule is re-checked every minute from 15 minutes before kick-off; scores are labelled as re-checked, not live.
- RSS goes through rss2json first. If rss2json refuses (it rate-limits "new" feeds per IP), the raw XML is tried directly (The Athletic allows this) and then through public CORS proxies, best-effort. Every feed's status is listed at the bottom of the News page.
- ESPN's `/teams/359` endpoint sends no CORS header and is optional enrichment only.
- In local dev, `vite.config.js` adds a same-origin `/__proxy` limited to ESPN, rss2json and the feed hosts. It doesn't exist on GitHub Pages.
