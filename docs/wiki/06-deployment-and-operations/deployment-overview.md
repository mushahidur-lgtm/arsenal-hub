# Deployment overview

[Wiki home](../README.md) · [GitHub Pages](github-pages.md) · [GitHub Actions](github-actions.md) · [Release process](release-process.md)

| Item | Value |
|---|---|
| Host | GitHub Pages (source: GitHub Actions) |
| Repository | `mushahidur-lgtm/arsenal-hub` |
| URL | <https://mushahidur-lgtm.github.io/arsenal-hub/> |
| Trigger | Push to `main`, or manual `workflow_dispatch` |
| Gate | Unit tests and Chromium e2e must pass |
| Artifact | `dist/` |
| Environments | One: production. No staging. |

A push to `main`, including a merge, **is** a production release. Documentation-only pushes also run the workflow and redeploy.
