# Prompt 01: Production Quality Assurance & Testing

# Arsenal Hub — Production Quality Assurance & Testing

You are working on my existing Arsenal Hub website, built with React and deployed through GitHub Pages.

Live website: https://mushahidur-lgtm.github.io/arsenal-hub/#/

GitHub repository: https://github.com/mushahidur-lgtm/arsenal-hub

## Objective

Perform a comprehensive quality assurance and testing pass across the entire Arsenal Hub application.

The website has recently been expanded with the following features:

1. Daily briefing and news intelligence
2. Men's and women's squad centre
3. Player comparison
4. Transfer intelligence tracker
5. Match centre, fixtures, results and standings
6. Tactical match centre
7. Arsenal history and records
8. Personalization, bookmarks and followed players
9. Unified search
10. Responsive navigation and dark mode

Your task is to ensure these existing features work reliably, data is handled correctly, navigation works, and the website builds and deploys successfully.

**Important: This is a QA and stabilization task, not a redesign or a new feature development project.**

Do not remove existing functionality, make unnecessary architectural changes, or introduce new features.

---

## Phase 1 — Understand the existing application

Before making changes:

1. Inspect the complete project structure.
2. Review `package.json`, dependencies, routing, API integrations and data-fetching utilities.
3. Identify the existing testing setup, if any.
4. Review all major components and their dependencies.
5. Identify external APIs, RSS feeds, CORS proxies and data sources.
6. Review GitHub Pages deployment configuration and routing.
7. Identify existing error-handling, caching and fallback mechanisms.

Create a checklist of all major features and their important user interactions.

Do not assume something works simply because a component exists.

## Phase 2 — Add automated testing

Set up a suitable testing framework if the project does not already have one.

Preferred options:
- Vitest for unit and integration testing.
- React Testing Library for component testing.
- Playwright for end-to-end browser testing.

Use the existing project conventions where possible. Avoid adding unnecessary dependencies.

### A. Unit tests

Write tests for important application logic, including:

**News**
- Duplicate article detection.
- Story grouping.
- Source credibility classification.
- Article filtering.
- Search functionality.
- Missing or malformed article data.
- Invalid publication dates.

**Transfers**
- Transfer status classification.
- Source attribution.
- Rumour confidence handling.
- Duplicate transfer reports.
- Dismissed rumours.
- Missing player or club information.

**Squad and player comparison**
- Player search and filtering.
- Position filtering.
- Men's and women's squad separation.
- Missing statistics.
- Null and undefined values.
- Player comparison calculations.
- Players with incomplete data.

**Matches**
- Fixture and result formatting.
- Date and timezone conversions.
- Match status handling.
- Standings calculations, if implemented locally.
- Missing match data.
- Postponed and cancelled fixtures.

**Personalization**
- Bookmark creation and removal.
- Followed-player preferences.
- Watchlist functionality.
- Local storage persistence.
- Invalid or corrupted local storage data.
- Handling unavailable browser storage.

**Search and navigation**
- Search across all supported content types.
- Empty search results.
- Invalid routes.
- Direct navigation to hash-based routes.

### B. Component tests

Test important components and user interactions:

- Homepage and daily briefing.
- News cards and filters.
- Squad pages.
- Player profile pages.
- Player comparison.
- Transfer tracker.
- Fixture and match detail pages.
- Tactical match centre.
- History and records.
- Bookmarks and watchlists.
- Search.
- Main navigation and mobile navigation.
- Dark mode.

Verify that buttons, links, filters, dropdowns, tabs and interactive elements perform their intended actions.

Do not create tests that merely confirm a component renders. Test meaningful behaviour.

## Phase 3 — End-to-end browser testing

Use Playwright to test the actual application in a browser.

Test the following user journeys:

### Journey 1: Homepage
- Open the homepage.
- Verify the daily briefing loads.
- Verify the next Arsenal match appears when match data is available.
- Open a news article.
- Navigate back to the homepage.
- Verify no broken sections or console errors.

### Journey 2: News
- Open the news section.
- Change news filters.
- Search for a specific Arsenal topic.
- Open an article.
- Verify external article links work.
- Test empty search results.

### Journey 3: Squad
- Open the men's squad.
- Open a player profile.
- Search for a player.
- Filter by position.
- Switch to the women's squad.
- Verify the correct squad data is displayed.

### Journey 4: Player comparison
- Select two players.
- Compare their available statistics.
- Change one of the selected players.
- Test players with missing statistics.
- Verify that missing values do not produce NaN, undefined or misleading results.

### Journey 5: Transfer tracker
- Open the transfer section.
- Test transfer status filters.
- Open a transfer report.
- Verify source attribution and reporting dates.
- Test the watchlist.
- Verify dismissed rumours are handled correctly.

### Journey 6: Match centre
- Open fixtures.
- Open results.
- Open standings.
- Open a match detail page.
- Test lineup and tactical views where data exists.
- Verify dates, scores and match statuses.

### Journey 7: Personalization
- Bookmark a news article.
- Follow a player.
- Add a transfer to the watchlist.
- Refresh the browser.
- Verify preferences persist.
- Remove saved items and verify they disappear.

### Journey 8: Search
- Search for an Arsenal player.
- Search for a transfer target.
- Search for a news topic.
- Search for a match.
- Test searches with no results.

### Journey 9: History
- Open Arsenal history.
- Navigate between historical sections.
- Verify records and timeline content display correctly.

### Journey 10: Navigation
- Navigate between all main sections.
- Use browser back and forward.
- Refresh a nested hash route.
- Open a nested route directly.
- Verify there are no broken routes or blank screens.

If an interaction cannot be automated reliably, document it and provide a manual verification step.

## Phase 4 — API and data-source reliability

Inspect every external data integration.

The website uses public data providers, RSS feeds and potentially CORS proxy services.

Test:

1. Successful API responses.
2. Empty responses.
3. Invalid JSON.
4. HTTP 404 and 500 errors.
5. Network timeouts.
6. Rate limits.
7. CORS failures.
8. Missing fields.
9. Unexpected response formats.
10. Slow responses.

Implement fixes where needed.

### Requirements

- One failing data source must not crash the entire application.
- Independent sections should load independently.
- Loading indicators should be visible where appropriate.
- Error messages should explain when data cannot be retrieved.
- Cached data should be displayed when appropriate.
- Cached data must be distinguishable from fresh data.
- Prevent unnecessary repeated API calls.
- Avoid duplicate requests caused by component re-rendering.
- Ensure retry mechanisms do not create infinite request loops.
- Validate incoming data before rendering it.

Do not silently replace unavailable live data with fabricated sample data.

Never invent match results, player statistics, transfer information or news articles.

## Phase 5 — Responsive and cross-browser testing

Test the website at these viewport sizes:

| Device | Viewport |
|---|---|
| Small mobile | 320 × 568 |
| Standard mobile | 390 × 844 |
| Large mobile | 430 × 932 |
| Tablet | 768 × 1024 |
| Laptop | 1366 × 768 |
| Desktop | 1920 × 1080 |

Check:

- Horizontal overflow.
- Navigation layout.
- Text clipping.
- Cards and grids.
- Tables and statistics.
- Interactive pitch and tactical layouts.
- Modal and dropdown positioning.
- Touch target sizes.
- Image scaling.
- Loading and error states.

Test Chrome, Firefox and Safari/WebKit where possible.

Pay particular attention to mobile navigation, player comparison tables, match lineups and transfer cards.

## Phase 6 — Accessibility checks

Improve accessibility without changing the visual identity of the website.

Check:

- Semantic HTML.
- Heading hierarchy.
- Keyboard navigation.
- Visible focus states.
- Accessible button labels.
- Form labels.
- Image alt text.
- Sufficient colour contrast.
- Modal keyboard behaviour.
- Screen reader support.
- Reduced-motion preferences.

Use automated accessibility checks where practical, but manually inspect important interactive components too.

## Phase 7 — GitHub Pages deployment validation

This application is deployed using GitHub Pages.

Verify:

1. Production build completes successfully.
2. Correct Vite base path is configured.
3. Hash-based routing works.
4. Direct links to nested routes work after refreshing.
5. Assets load correctly from GitHub Pages.
6. Images, icons, fonts and stylesheets do not return 404 errors.
7. No local development URLs are used in production.
8. No API keys, credentials or secrets are exposed in frontend code.
9. Environment variables are handled safely.
10. The deployed application does not depend on a local development server.

Run the production build and preview the production output locally before considering the work complete.

If GitHub Actions is already configured, inspect and improve the existing workflow rather than creating a conflicting deployment workflow.

Add a CI workflow if necessary that:

- Installs dependencies.
- Runs unit and integration tests.
- Runs the production build.
- Runs configured lint checks.
- Reports failures clearly.

Do not automatically deploy an untested build.

## Phase 8 — Performance and stability

Check for:

- Unnecessary component re-renders.
- Large JavaScript bundles.
- Unoptimized images.
- Unnecessary API requests.
- Memory leaks.
- Event listeners that are not cleaned up.
- Unhandled promise rejections.
- React key warnings.
- Console errors and warnings.
- Excessive local storage usage.

Make targeted optimizations only where they provide measurable improvements.

## Phase 9 — Final verification and report

After implementing fixes:

1. Run all automated tests.
2. Run the production build.
3. Run the Playwright end-to-end tests.
4. Check the browser console.
5. Verify all major navigation routes.
6. Verify mobile and desktop layouts.
7. Verify GitHub Pages configuration.
8. Document anything that could not be tested.

Provide a final report containing:

**A. QA summary**
- Overall test results.
- Number of tests created.
- Number of tests passed.
- Number of tests failed.
- Build status.

**B. Bugs identified**
- Description.
- Severity.
- Affected component.
- Root cause.

**C. Changes implemented**
- Files modified.
- Bugs fixed.
- Improvements made.

**D. Remaining issues**
- External APIs that remain unreliable.
- Features that require manual verification.
- Any limitations that cannot be fixed without changing data providers.

**E. Deployment readiness**
- Confirm whether the project is ready for production deployment.
- State whether the GitHub Pages deployment was actually verified.
- Clearly distinguish local testing from live production testing.

---

## Important implementation rules

1. Preserve the existing Arsenal Hub design, branding and functionality.
2. Do not rebuild the application from scratch.
3. Do not remove any existing feature.
4. Do not introduce new product features during this task.
5. Avoid unnecessary dependency additions.
6. Do not hardcode fake data to make tests pass.
7. Do not expose API keys or secrets.
8. Keep the GitHub Pages deployment compatible.
9. Fix the root cause of bugs rather than hiding errors.
10. If something is already implemented correctly, leave it alone.

**Work independently through the QA process. Do not stop after producing a list of recommendations. Implement the necessary tests and fixes, run the verification steps, and provide the final report.**
