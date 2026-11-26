# Accessibility

[Wiki home](../README.md) · [Design system](../02-architecture/design-system.md)

## Verified by tests

`tests/e2e/a11y.spec.js` and `responsive.spec.js`:

- axe WCAG 2.x A/AA rules on the main pages in light and dark, plus the search dialog, comparison picker and More menu
- One `h1` per page, no skipped heading levels, images have `alt`
- Skip link, visible focus, keyboard-operable tabs
- Search dialog traps and returns focus
- Reduced-motion preference honoured
- Touch targets in navigation; no horizontal overflow from 320px to 1920px

## In the code

Semantic tables with captions; `role="status"` for loading and stale messages; results marked by shape and letter as well as colour; icon buttons have labels; the `.hit` utility enlarges small controls.

## Not verified

- No testing with real screen readers or by people with disabilities.
- Automated tools find only part of the problems. This is **not** a conformance claim.
- Scans run on recorded data; unusual live content was not covered.

## Known weak points

- Bottom-navigation labels are 10px.
- Some inline text links are smaller than 44px.
- Chips use `role="tab"` without associated tab panels or arrow-key handling, so they do not fully follow the tabs pattern.
