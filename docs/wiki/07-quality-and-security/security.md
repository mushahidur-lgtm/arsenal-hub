# Security

[Wiki home](../README.md) · [Environment configuration](../06-deployment-and-operations/environment-configuration.md)

This is a documentation-time review, **not** a security audit or penetration test. Absence of a finding does not mean the application is secure.

## Contents

- [Verified findings](#verified-findings)
- [Verified observations](#verified-observations)
- [Recommendations](#recommendations)
- [Not reviewed](#not-reviewed)

## Verified findings

| # | Finding | Evidence | Severity (judgement) |
|---|---|---|---|
| 1 | **Article links are not restricted to `http`/`https`.** Links from feeds and ESPN are used as `href` without checking the scheme. A malicious or tampered feed (including through a third-party proxy) could supply a `javascript:` URL; React 18 does not block it. | `src/lib/feeds.js` passes `link` through; images are scheme-checked, article links are not | Medium. Needs a hostile feed or proxy and a user click |
| 2 | **A stray capture of HTTP response headers was committed to the repository.** It has been removed from every branch by rewriting history. Cached copies of old commits may remain on GitHub's side, and existing clones are unaffected. | `git log --all` on a fresh clone shows no commit containing it | Low, residual |
| 3 | **`npm audit` reports 3 vulnerabilities** (2 critical, 1 moderate) in `tinypool` and `@vitest/mocker`, used by Vitest. The fix needs a major upgrade. | `npm audit` on 2026-11-26 | Low for the live site (test tooling only); relevant to developer machines and CI |

Findings 1 and 3 were not changed. Finding 2 was addressed after the documentation work, at the owner's request.

## Verified observations

- No API keys, tokens or secret environment variables were found by pattern search of the source and workflows.
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in `src/`.
- All `target="_blank"` links include `rel="noopener noreferrer"`.
- Feed HTML is reduced to text before display.
- Browser storage holds preferences and public data only; any script on the origin could read it.
- No Content Security Policy is defined.
- The dev proxy allows only listed hosts over HTTPS and exists only in dev and preview servers.

## Third parties that receive requests

ESPN, rss2json, the publishers' feed and image hosts, Wikipedia, Google Fonts, and, after a failure, allorigins and codetabs. They can see the visitor's IP address (proxies also see the requested URL, and can alter the response).

## Recommendations

Recommendations only, not implemented:

1. Accept only `http:` and `https:` links when parsing.
2. Ask GitHub Support to clear cached views of the old commits, and discard any older clones.
3. Upgrade Vitest and re-run `npm audit`.
4. Add a Content Security Policy via a meta tag and test it.
5. Replace public proxies with a proxy you control, if reliability or integrity matters.
6. Self-host fonts.
7. Enable GitHub's dependency and secret scanning; pin Actions to commit hashes.

Do not silence audit or scanner alerts to make them disappear.

## Not reviewed

Provider terms, GitHub account and repository settings, branch protection, third-party code inside dependencies, and the Git history beyond the file above.
