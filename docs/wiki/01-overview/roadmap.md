# Roadmap

[Wiki home](../README.md) · [Known limitations](../07-quality-and-security/known-limitations.md)

**Everything on this page is a proposal. None of it is implemented**, and priorities are suggestions from a code review, not agreed commitments.

## High priority

| Proposal | Why |
|---|---|
| Ask GitHub Support to clear cached views of pre-rewrite commits | See [Security](../07-quality-and-security/security.md) |
| Upgrade Vitest to a patched major version | `npm audit` reports advisories in test tooling |
| Verify live and full-time modes on a real match day | Only tested with re-timed recorded data |
| Refresh the root README's architecture and Node version text | It predates the current module layout |

## Medium priority

| Proposal | Why |
|---|---|
| Exclude documentation folders from Tailwind's class scan | Markdown content can add unused CSS |
| Add a linter | No static checks beyond the build and tests |
| Own a small server-side data proxy | Reduces reliance on public CORS proxies and rss2json (adds hosting) |
| Self-host web fonts | Removes a third-party request |
| Error monitoring | Failures are only visible in the user's console today |
| Reduce app-wide re-rendering from the 30-second clock | Not yet measured; measure first |

## Low priority

| Proposal | Why |
|---|---|
| Larger bottom-navigation labels (currently 10px) | Legibility |
| Fixtures calendar export (`.ics`) | Convenience |
| Search within the squad on the Squad page | Today search is the global overlay and the comparison picker |
| TypeScript or JSDoc type checking | Safer refactoring of data shapes |

## Future possibilities

These need data the current free providers do not supply, or a backend:

- Detailed player statistics (minutes, xG/xA, passing, defending)
- Historical match analysis and season-over-season team analytics
- Richer live match experience (true live updates, shot maps)
- More visualisations
- Accounts and cross-device sync
- Push notifications or a service worker for offline use

Before building any of these, confirm the data source exists; see [Data sources](../04-data-and-integrations/data-sources.md). Prompts for this are in the [Claude prompt library](../09-claude-prompts/README.md).
