# Claude Code prompt library

[Wiki home](../README.md)

Reusable, copy-ready prompts for future work on Arsenal Hub. These are **instructions to give Claude Code**, not documentation of how the app works.

## How to use

1. Open the category, copy the whole code block.
2. Replace the `<PLACEHOLDERS>`.
3. Review the plan or findings before approving changes.

Every prompt has the same structure (role, context, objective, scope, files to inspect, requirements, constraints, testing, deliverables, acceptance criteria) and carries the same safeguards, including no commit, push or deploy without approval.

Historical prompts already used on this project are kept separately in the repository's `prompt/` folder if it has been committed.

## [Project understanding](project-understanding.md)

| Prompt | When to use |
|---|---|
| Understand the full architecture | Starting on the project. |
| Explain an unfamiliar component | Before editing a component you do not know. |
| Trace a feature from UI to API | Debugging or extending a feature. |
| Analyse the impact of a proposed change | Before agreeing to a change. |

## [Code review](code-review.md)

| Prompt | When to use |
|---|---|
| Review the entire repository | Periodic health check. |
| Review one component | Reviewing a specific file. |
| Find code smells and duplication | Planning a clean-up. |
| Identify architectural problems | Before a larger investment. |

## [Bug fixing](bug-fixing.md)

| Prompt | When to use |
|---|---|
| Investigate a production bug | Something is wrong on the live site. |
| Diagnose an API failure | A section shows 'Couldn't load'. |
| Fix a rendering issue | Something renders wrongly or crashes. |
| Fix a responsive layout problem | Layout breaks at some width. |
| Investigate incorrect football data | A score, status or statistic looks wrong. |
| Fix a routing problem | A link or refresh lands in the wrong place. |

## [Feature development](feature-development.md)

| Prompt | When to use |
|---|---|
| Add a new Arsenal feature | Any new capability. |
| Add new player statistics | Showing another metric. |
| Improve match details | Enhancing the match page. |
| Add a data visualisation | Charting existing data. |
| Integrate another football data provider | Adding or replacing a source. |
| Extend an existing component | Adding an option or variant. |

## [UI and UX improvements](ui-ux-improvements.md)

| Prompt | When to use |
|---|---|
| Improve the dashboard | Home feels cluttered or unclear. |
| Improve mobile responsiveness | Phone experience problems. |
| Improve navigation | Users struggle to find things. |
| Improve accessibility | Accessibility pass. |
| Maintain consistent styling | Reviewing new UI. |
| Improve data presentation | Tables or cards are hard to read. |

## [Football data and APIs](football-data-and-apis.md)

| Prompt | When to use |
|---|---|
| Evaluate football API providers | Considering a new data source. |
| Integrate a new API | After choosing a provider. |
| Compare data providers' accuracy | Checking one source against another. |
| Improve caching | Too many requests or stale data. |
| Validate API response data | Hardening a parser. |
| Handle outages and rate limits | Providers failing or throttling. |

## [Testing and QA](testing-and-qa.md)

| Prompt | When to use |
|---|---|
| Generate unit tests | A module lacks coverage. |
| Generate integration tests | Testing modules together. |
| Test critical user journeys | Browser-level confidence. |
| Browser smoke test | After a deploy. |
| Validate mobile layouts | Before release. |
| Regression test | After a change. |

## [Performance optimisation](performance-optimization.md)

| Prompt | When to use |
|---|---|
| Analyse bundle size | The app feels heavy. |
| Optimise rendering | UI stutters. |
| Reduce unnecessary API requests | Too much traffic. |
| Improve caching for speed | Slow repeat visits. |
| Optimise images and assets | Slow image loading. |
| Improve initial page load | Slow first paint. |

## [Refactoring](refactoring.md)

| Prompt | When to use |
|---|---|
| Refactor a component | A file is hard to work in. |
| Improve type safety | Data shapes cause mistakes. |
| Simplify state management | State is hard to follow. |
| Reduce code duplication | Repeated logic. |
| Improve folder organisation | Files are hard to find. |

## [Security audit](security-audit.md)

| Prompt | When to use |
|---|---|
| Review dependencies | Regular dependency check. |
| Audit API integrations | Reviewing data intake. |
| Review secret management | Checking for leaks. |
| Identify exposed sensitive information | Before publishing changes. |
| Review client-side security | Browser hardening. |
| Assess third-party integrations | Reviewing external services. |

## [Deployment and DevOps](deployment-and-devops.md)

| Prompt | When to use |
|---|---|
| Review GitHub Actions | Pipeline health check. |
| Diagnose a failed deployment | A deploy run failed. |
| Improve GitHub Pages configuration | Hosting improvements. |
| Validate a production build | Before releasing. |
| Review the release workflow | Process improvement. |

## [Release readiness](release-readiness.md)

| Prompt | When to use |
|---|---|
| Full pre-release audit | Before a significant release. |
| Validate all major features | Feature sign-off. |
| Review outstanding bugs | Prioritising before release. |
| Check documentation completeness | Docs drift. |
| Produce a release-readiness report | Final summary for approval. |
