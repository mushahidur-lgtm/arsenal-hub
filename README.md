# Arsenal FC Live Hub

A live Arsenal FC fan dashboard built with React 18, Tailwind CSS v4 and lucide-react on Vite.
Every page load, and every press of **Refresh Data**, fetches fresh data with `cache: "no-store"`. Nothing is hardcoded.

Live site (once deployed): **https://mushahidur-lgtm.github.io/arsenal-hub/**

```
arsenal-hub/
├── .github/workflows/deploy.yml   # build + deploy to GitHub Pages on push to main
├── public/favicon.svg
├── src/
│   ├── App.jsx                    # the whole app (data layer + UI), self-contained
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Tailwind + class-based dark mode
├── index.html                     # title "Arsenal FC Live Hub", favicon
├── vite.config.js                 # base: "/arsenal-hub/" + dev-only CORS proxy
└── package.json / package-lock.json
```

> **Tailwind v4 note:** Tailwind is wired in through the official `@tailwindcss/vite` plugin.
> Tailwind v4 handles vendor prefixing itself, so there is no `postcss.config.js` and no `autoprefixer` dependency.
> Adding them would be unused weight.

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
| Squad + player stats | ESPN `eng.1/teams/359/roster` |
| League table | ESPN `site.web.api.espn.com/.../eng.1/standings` |
| Team record (optional) | ESPN `eng.1/teams/359` |
| Arsenal news | rss2json → Arseblog and r/Gunners, plus ESPN `eng.1/news?team=359` |
| Football news | ESPN `eng.1/news`, `uefa.champions/news` |

### CORS and failure handling

- Each section loads independently. A failing source shows an error with **Retry**. If a refresh fails, the section keeps the last data it loaded and shows a warning banner.
- ESPN's `/teams/359` endpoint sends no CORS header. On GitHub Pages it is tried through public proxies (allorigins, codetabs), best-effort. Every stat it provides (position, record, home/away splits) is also computed from the schedule and standings, so the site never depends on it.
- In local dev, `vite.config.js` adds a same-origin `/__proxy` limited to ESPN and rss2json. It doesn't exist on GitHub Pages and isn't used there.
- rss2json sometimes rate-limits Reddit. Arsenal news then comes from Arseblog and ESPN, with a note on the page.
