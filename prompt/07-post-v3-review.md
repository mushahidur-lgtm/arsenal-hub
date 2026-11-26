# Prompt 07: Post-v3.0 Review and Improvement

Arsenal Hub – Post-v3.0 Review and Improvement
You are working on my existing Arsenal Hub React application.
Live website:
https://mushahidur-lgtm.github.io/arsenal-hub/
GitHub repository:
https://github.com/mushahidur-lgtm/arsenal-hub
Objective
Perform a comprehensive review of the current implementation and improve its quality, reliability and user experience.
IMPORTANT CONSTRAINTS:

* Preserve the existing architecture and working features.
* Do not rebuild the application.
* Do not introduce unnecessary dependencies.
* Do not add new major features during this iteration.
* Prioritize reliability, correctness, performance and usability.
* Do not fabricate football statistics or news.
* Keep the application compatible with GitHub Pages.

Task 1 – Audit existing implementation
Inspect the complete codebase.
Review:

* React components and application structure.
* Data fetching and caching.
* ESPN and RSS integrations.
* Error handling.
* Local storage.
* Routing and navigation.
* Responsive layouts.
* Existing unit and E2E tests.

Identify actual defects rather than making speculative changes.
Task 2 – Automated testing
Run:

* npm run build
* npm run test
* npm run test:e2e

Add or improve tests for:

* News deduplication.
* Transfer classification.
* Date and timezone handling.
* Missing player statistics.
* Data-fetching failures.
* Cache expiration and refresh.
* Hash-based routing.
* Deep links.
* Local storage persistence.

Ensure tests are deterministic and do not depend on unreliable live external feeds.
Task 3 – Data reliability
Verify that:

* Live, upcoming and completed matches are correctly classified.
* Data timestamps are accurate.
* Stale cached data is clearly identified.
* Missing statistics are never represented as zero.
* RSS failures do not break other news sources.
* Transfer rumours are not presented as confirmed transfers.
* Source attribution is visible.
* Refresh actions actually refresh the relevant data.

Task 4 – User experience
Inspect every page on desktop and mobile.
Check:

* Navigation and active states.
* Mobile bottom navigation and More menu.
* Loading skeletons.
* Empty states.
* Error states.
* Typography and spacing.
* Horizontal overflow.
* Keyboard accessibility.
* Contrast and screen-reader labels.

Fix identified usability defects without unnecessarily changing the existing design.
Task 5 – Performance
Review:

* Duplicate API requests.
* Cache policies.
* Unnecessary React re-renders.
* Component loading.
* Large bundles.
* Image loading.

Only implement optimizations that produce measurable improvements without compromising data freshness.
Task 6 – Deployment validation
Verify:

* Production build succeeds.
* GitHub Actions deployment succeeds.
* GitHub Pages base path works.
* All assets load correctly.
* Deep links survive refresh.
* No API secrets are exposed.

Deliverables
Provide:

1. Findings ranked by severity.
2. Defects fixed.
3. Tests added and test results.
4. Performance improvements.
5. Remaining limitations.
6. Deployment validation results.

Do not claim that something works unless it has actually been tested.
Complete the work incrementally, preserving existing functionality. Run the complete test suite after modifications.
The objective is to make the existing Arsenal Hub production-quality, not to introduce another redesign.
