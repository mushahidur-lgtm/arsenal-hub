# Troubleshooting

[Wiki home](../README.md) · [Error handling](../04-data-and-integrations/error-handling.md)

## Setup and tests

| Symptom | Likely cause and fix |
|---|---|
| Blank page or 404 at `http://localhost:5173/` | Open the `/arsenal-hub/` path |
| `npm test` fails on start-up with an engine error | Node too old; see [Prerequisites](prerequisites.md) |
| `Executable doesn't exist` | Run `npx playwright install` |
| `browserType.launch: spawn UNKNOWN` (seen with Firefox on one Windows machine) | Local environment problem; run `--project=chromium` locally and rely on CI for the others |
| WebKit keyboard-focus tests fail on Windows but pass in Linux CI | Observed once; treat CI as the reference and investigate if CI fails |
| E2E results don't match your changes | An old server on port 4173 is being reused; stop it |
| `port 4173 is already in use` | Stop the other process |
| LF/CRLF warnings from Git | Expected on Windows |

## Data problems in the app

1. Open the console and run `afcDiagnostics()`: look at `providers`, `fallbacks`, `cooldowns`, `dropped`.
2. Network tab: distinguish CORS failures, 429s and 5xx.
3. A section says "Couldn't load": press Retry; check the provider directly.
4. Looks old: check the header freshness line and "Last updated".
5. Reset one browser's data: remove the `afc-*` keys in storage (this also removes bookmarks and preferences).

| Symptom | Explanation |
|---|---|
| Console shows a CORS error for `…/eng.1/teams/359` | The optional team summary; the squad uses a different endpoint |
| Everyone shows "No injury reported" | The provider's injury lists are empty |
| Some feeds missing | rss2json rate limit or feed outage; others still load |
| "… asked us to slow down" | A 429 cooldown; wait the stated seconds |
| A transfer has no player card | No unique player match |
