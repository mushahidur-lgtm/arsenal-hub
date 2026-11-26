# Prompt 06: Engineering Improvements P1

Arsenal Hub – Engineering Improvements P1
Review the existing repository before making changes.
Repository:
https://github.com/mushahidur-lgtm/arsenal-hub
Objective
Improve production reliability and data correctness without changing the existing UI, adding unnecessary features or rebuilding the architecture.
1. Player availability
Inspect `src/lib/data.js`, particularly `availabilityOf()`.
Fix the misleading assumption that no injury report means a player is available.
Introduce explicit states:

* Injured
* Doubtful
* Suspended
* No injury reported
* Unknown

Ensure the UI communicates the difference.
Add unit tests for every state, including missing and malformed injury information.
2. API response validation
Review all external API parsers.
Introduce lightweight runtime validation for:

* Fixtures and match details.
* Squad and player information.
* League standings.
* Player statistics.
* RSS news responses.

Do not crash the entire application when an individual field is missing or malformed.
Do not invent missing data or substitute zero for unavailable statistics.
3. Caching improvements
Review the existing caching implementation in `src/lib/data.js`.
Implement:

* Maximum cache size.
* LRU eviction.
* Configurable TTL by data category.
* Cache hit/miss diagnostics.
* Proper in-flight request handling.
* Safe refresh behaviour.

Preserve the existing deduplication of simultaneous requests.
4. CORS and provider reliability
Review public CORS proxy fallback behaviour.
Improve:

* Timeout handling.
* Failure classification.
* Retry strategy.
* Provider-specific diagnostics.
* Fallback observability.

Do not send requests through unnecessary proxies.
Do not expose secrets or introduce paid dependencies.
5. Automated testing
Add tests for:

* Missing ESPN properties.
* Unexpected API response structures.
* Invalid match dates.
* Missing player injury records.
* Cache expiration.
* Cache eviction.
* Failed network requests.
* RSS parsing failures.

Ensure the tests use deterministic fixtures rather than depending on live API responses.
6. Constraints

* Preserve React 18 and Vite.
* Preserve GitHub Pages compatibility.
* Preserve existing routing.
* Preserve local storage functionality.
* Preserve all existing pages and features.
* Do not redesign the UI.
* Avoid unnecessary dependencies.
* Keep changes focused and incremental.

7. Validation
Run:

* npm ci
* npm test
* npm run test:e2e
* npm run build

Fix all regressions.
Deliverables
Provide:

1. Files modified.
2. Defects identified.
3. Changes implemented.
4. Tests added.
5. Test execution results.
6. Remaining technical risks.

Do not claim a test passed unless it was actually executed.
