# Prerequisites

[Wiki home](../README.md) · Next: [Local setup](local-setup.md)

| Software | Requirement |
|---|---|
| Node.js | **22.22.2 or later in the 22 line, 24.15 or later, or 26+** (the installed `jsdom` used by tests sets this; Vite alone accepts 18, 20 or 22+). CI uses Node 22. |
| npm | The one shipped with Node |
| Git | Any recent version |
| Browsers for e2e tests | Installed by Playwright (`npx playwright install`) |
| GitHub CLI | Optional |

No database, backend, API key or `.env` file is needed.

The root README says "Node 20+", which is not enough to run the unit tests with the current dependencies.
