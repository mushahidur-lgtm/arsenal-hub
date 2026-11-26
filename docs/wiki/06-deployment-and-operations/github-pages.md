# GitHub Pages

[Wiki home](../README.md) · [GitHub Actions](github-actions.md)

## How hosting works

A project site is served from `/<repository-name>/`. The repository `arsenal-hub` therefore lives at `https://mushahidur-lgtm.github.io/arsenal-hub/`.

## Base path and assets

`vite.config.js` sets `base: "/arsenal-hub/"`, so built asset URLs are prefixed with it. `public/` files are copied to the root of `dist/`. **If the repository is renamed, change `base`**, the Playwright base URL and the absolute `og:url`/`og:image` values in `index.html`.

## Routing

Hash routing means Pages only ever serves `index.html`; no `404.html` rewrite is needed.

## Verifying a deployment

1. The "Deploy to GitHub Pages" run for the commit is green.
2. The live HTML references the new asset file names (compare with a local `npm run build` of the same commit):

```bash
curl -s https://mushahidur-lgtm.github.io/arsenal-hub/ | grep -o 'assets/index-[^"]*'
```

3. Assets return 200 and routes load; run the [live audit](../05-development/testing.md#audits).
4. A browser may keep the old page briefly; hard-refresh.

## First-time setup

Enable **Settings → Pages → Source: GitHub Actions**. The root README has command-line steps.
