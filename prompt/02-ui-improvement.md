# Prompt 02: UI improvement (5 phases)

I want to improve the UI of Arsenal Hub (this repo, deployed at
https://mushahidur-lgtm.github.io/arsenal-hub/). Use the installed skills
web-design-guidelines, ui-ux-pro-max, frontend-design and webapp-testing.
Work in the phases below, in order. Commit after each phase with a clear
message. STOP and wait for my approval where marked.

## Constraints (apply to every phase)
- Keep the current brand: red/dark palette, Inter + Montserrat.
- Don't change routes, data sources, localStorage keys or the
  "unofficial fan site" disclaimer.
- Keep or improve accessibility: alt text, labels, keyboard access, contrast.
- Mobile-first: everything must work at 375px with the bottom nav.

## Phase 1: Audit (web-design-guidelines)
Audit the Home, Matches, Squad and Transfers views. Prioritise:
- News cards: the image link and the headline link both point to the same
  article, and the image link has no accessible name. Merge them, or hide the
  image link from assistive tech (aria-hidden="true" tabindex="-1").
- Visible focus states on filter chips, tabs and the bottom nav.
- Colour contrast on the red-on-dark match card and in dark mode.
- Touch targets of at least 44px in the bottom nav and filter chips.
Fix all high-severity issues, then give me a list of the rest by severity.

## Phase 2: Loading, error and stale states
Every data section needs three states:
- A skeleton loader while fetching.
- A clear "Couldn't load [section] — Retry" state on failure.
- A "Last updated Xh ago" label when showing cached data.
Critical bug: the request to site.api.espn.com/.../eng.1/teams/359 fails
with a CORS error on every load, and the proxy fallbacks time out (allorigins
after ~6s, codetabs after ~9s). Yet the Squad page still says "fetched just
now" with 31 available / 0 injured, and Home says "ESPN lists no injured,
suspended or doubtful players". Never show zero counts or a "fetched just
now" label when the request failed; show the error or stale state instead.
Also add a 5s overall timeout so failed proxies don't delay the page.

## Phase 3: Home page hierarchy (ui-ux-pro-max)
The home page stacks 10 sections at equal visual weight: match card, top
story, five things, latest, transfer watch, upcoming, results, table,
injuries, fan talk, your hub. Propose 2 layout options for a mobile-first
sports fan app:
- What stays above the fold.
- What collapses, moves to a tab, or is removed.
- How the layout changes on matchday vs non-matchday.
Describe each at wireframe level. Don't write code.
>>> STOP and wait for me to pick an option. <<<

## Phase 4: Visual refinement (frontend-design)
Implement the option I picked, plus:
- Matchday mode: on match day the hero shows the live score, a lineups link
  and key events. After full time it shows the result and a talking-points
  card.
- Transfer watch: replace the initials avatars (PH, DR) with player
  headshots (fall back to initials) and show status as a stepper:
  Rumour → Talks → Agreed → Complete.
- Form pills: don't rely on colour alone for W/D/L; add shape or icon cues.
- League table: highlight Arsenal's row and show the points gap to 2nd place
  and to the top-4 cut-off.
- News cards: same layout with or without an image. Make the source badge
  (Reliable / Secondary / Opinion) easier to see.
- Small fixes: "Five things to know" currently starts at #2, so number the
  top story as #1 or rename the section. Re-tag "Arsenal consensus reached
  over £162m January transfers" as TRANSFER, not MATCH, by giving
  transfer/window/£ keywords priority in the tagging logic.
- Add an og:image (a match-card-style social preview) and og:title.

## Phase 5: Test (webapp-testing)
Using Playwright against the local dev server:
- Visit every bottom-nav route plus one match page and one player page, in
  light and dark mode, at 375px and 1280px. Save screenshots.
- Check the countdown, the news filters (All/Match/Transfers/Injuries),
  "Clear history" and the theme toggle.
- Block requests to site.api.espn.com and api.rss2json.com, then confirm the
  error and stale states from Phase 2 appear and that nothing shows
  "0 injured".
- Report console errors, horizontal overflow and broken images.

When you're done, give me a short summary: what changed, what's left from
the audit, and the before/after screenshot paths.
