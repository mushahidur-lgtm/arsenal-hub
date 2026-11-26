# Design system

[Wiki home](../README.md) · [Component architecture](component-architecture.md) · [Accessibility](../07-quality-and-security/accessibility.md)

## Contents

- [Principles](#principles)
- [Colour](#colour)
- [Typography](#typography)
- [Layout and breakpoints](#layout-and-breakpoints)
- [Components and states](#components-and-states)
- [Adding UI consistently](#adding-ui-consistently)

## Principles

Defined in the comments of [`src/index.css`](../../../src/index.css): red is an **accent**, not a page background. Pages are off-white (light) or charcoal (dark). Components use semantic utilities, so the theme changes in one place.

## Colour

Brand variables:

| Variable | Value |
|---|---|
| `--ars-red` | `#db0007` |
| `--ars-red-bright` | `#ef0107` |
| `--ars-crimson` | `#9c0004` |
| `--ars-navy` | `#063672` |
| `--ars-gold` / `-deep` / `-light` | `#9c824a` / `#7a6436` / `#e0c68f` |

Semantic roles (light → dark):

| Utility | Light | Dark |
|---|---|---|
| `bg-page` | `#f5f4f1` | `#0e0e10` |
| `bg-surface` | `#ffffff` | `#17171a` |
| `bg-surface-2` | `#f0efeb` | `#222226` |
| `border-line` | `#e4e2dc` | `#2d2d32` |
| `text-ink` | `#141414` | `#f2f2f2` |
| `text-ink-muted` | `#5b5b62` | `#a3a3ab` |
| `text-accent` | `#c80006` | `#ff5a5f` |
| `from-hero-from` / `to-hero-to` | `#17171a` / `#3a0306` | `#141416` / `#2c0204` |

Also: `brand`, `crimson`, `navy`, `gold*`. Dark mode is class-based (`.dark` on `<html>`).

## Typography

- Body: **Inter**; headings (`h1`–`h3`, `font-display`): **Montserrat**, both from Google Fonts with Helvetica/Arial fallbacks.
- Numbers in tables and scores use `tabular-nums`.
- Small uppercase labels use the `eyebrow` class.

## Layout and breakpoints

Tailwind defaults. In practice: `sm` 640px, `md` 768px, `lg` 1024px (switches bottom nav to header nav), `xl` 1280px. Content is centred at `max-w-6xl`. `pb-safe` and `bottom-safe` keep content clear of the bottom bar and device insets.

Mobile-first: everything must work at 375px; tests also cover 320px.

## Components and states

| Need | Use |
|---|---|
| Card | `Panel` (rounded, `border-line`, `bg-surface`) |
| Section title and "see all" link | `SectionHead` |
| Filters | `Chips` (44px tall below `lg`), `Select` |
| Tables | Semantic `<table>` with caption, header scope, highlighted Arsenal row |
| Loading | `Skel`, `SkeletonRows` |
| Failure | `ErrorState` / `SectionError` with Retry |
| Empty | `EmptyState` with a plain explanation |
| Cached data | `StaleBanner` |
| Small controls | `.hit` class enlarges the tap area to 44px without changing the look |

Motion: `.fade-up` on page change; `prefers-reduced-motion` is respected.

## Adding UI consistently

1. Use semantic utilities, never raw hex in components.
2. Reuse the primitives above before creating new ones.
3. Provide all four states: loading, error with Retry, empty, and stale.
4. Do not rely on colour alone (add text or shape).
5. Check light and dark at 375px and 1280px, and run the accessibility tests.
