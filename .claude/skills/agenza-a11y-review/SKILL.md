---
name: agenza-a11y-review
description: Use when reviewing a new or changed admin-frontend screen, dialog, popover, or shell region for accessibility — keyboard operability, focus restore, SPA route announcement, contrast in both themes, target size, tooltips, shortcut keycaps, and pt-BR screen-reader output. Trigger on a PR that adds a route, an overlay, a nav region, or a primitive under src/shared/ui/.
---

# Reviewing a screen for accessibility

Four passes, cheapest signal first. Run them **in order** — a keyboard pass on a screen whose axe run
is red wastes your time, and a screen-reader pass on a screen you cannot `Tab` through tells you
nothing you didn't already know.

The passes are not interchangeable. **Automation finds roughly a third of what matters, and none of
what matters most.** A green axe run is the start of the review, never the end of it.

This skill *reviews*. To build the thing, use `agenza-ui-primitive` (anything in `shared/ui/`) or
`agenza-frontend-slice` (a feature screen).

## What the screen is measured against

- The behavioural contract:
  [`specs/002-ui-foundation/spec.md`](../../../apps/admin-frontend/specs/002-ui-foundation/spec.md) —
  User Story 3 (keyboard / screen reader), User Story 4 (shortcuts), FR-008 → FR-014, SC-001 → SC-004.
- The repo rule in [`AGENTS.md`](../../../apps/admin-frontend/AGENTS.md): every interactive control
  has an accessible name, decorative icons carry `aria-hidden`, and the primitive's own behaviour is
  preferred over a hand-rolled key handler.
- **Semantic tokens only.** A raw palette class is an accessibility finding, not just a style one —
  it is exactly how a contrast fix in one theme silently breaks the other.

Two mechanics that produce wrong review advice if you forget them: primitives are Base UI, so a Radix
`asChild` snippet neither compiles nor carries Radix's focus behaviour (ADR 0039); and shortcut
matching compares `event.key`, never `event.code`, because the persona types on ABNT2.

## Pass 0 — automated

Run the axe helper over the rendered component and the Playwright audit over the real route, in both
themes. → [`references/automation.md`](references/automation.md)

Green means **no machine-detectable violation**. axe structurally cannot see:

- whether the accessible name means the same thing as the visible label
- whether focus went anywhere sensible, or ever came back
- whether `Tab` order matches reading order
- whether the pt-BR announcement was correct, or happened at all
- whether the focus ring survives on *that* surface, in the theme that wasn't rendered
- whether a sticky header covers the thing that just took focus

Each is a pass 1–3 check below. Report a screen as "axe clean" — never as "accessible".

## Pass 1 — keyboard

Unplug the mouse. Focus the address bar, then `Tab` forward through the entire screen and
`Shift+Tab` back.

1. **First stop is "Pular para o conteúdo"**, and activating it moves focus into `<main>` — not just
   scrolls to it. *Fails when* the link is `sr-only` with no focus-visible rule: a sighted keyboard
   user watches focus vanish into nothing on the first `Tab`.
2. **Everything interactive is reachable, and everything reachable is operable.** *Fails when* a
   `<div onClick>` got `tabIndex={0}` but no `role` and no Enter/Space handler — reachable, dead.
3. **`Tab` order matches reading order.** *Fails when* flex/grid `order` or a responsive reflow moves
   a control visually without moving it in the DOM.
4. **Focus is visible at every single stop**, including over cards, over the brand violet, and over
   the sticky header (SC 2.4.13).
5. **`Esc` closes the overlay _and_ returns focus to the control that opened it.** The restore is the
   half that gets dropped. *Fails when* a hand-rolled `open` boolean replaces the primitive's Dialog:
   the overlay closes and focus falls back to `<body>`, so the next `Tab` restarts at the skip link.
6. **No trap outside a modal; a correct trap inside one.** `Tab` from the last control of an open
   dialog cycles to the first, and never escapes to the page behind.
7. **Route change moves focus to `<main tabIndex={-1}>`.** *Fails when* focus stays on the nav link:
   the next `Tab` continues down the sidebar and assistive tech is still reading the previous screen.
8. **Shortcuts** don't fire while focus is in a text field, single-character ones are switchable off
   (SC 2.1.4), and `Ctrl/⌘+K` plus `Esc` keep working when they're off.

## Pass 2 — both themes, both densities

Toggle claro → escuro → automático, and check at 375 px and at desktop width. A token that passes in
light can fail in dark; that is the normal case, not the exotic one.

- **Contrast, measured in both themes** — text, icons that carry meaning, borders that are the only
  boundary, and the focus ring against every surface it lands on.
- **SC 2.4.11 Focus Not Obscured** — the usual culprits here are the sticky header and the bottom
  nav. `Tab` to the last row of a long list and to the control just under the header: if either is
  covered, that is a failure even though focus is technically "visible".
- **SC 2.5.8 Target Size** — nav and row actions at ≥24 px, and the bottom nav at ≥44 px on coarse
  pointers. Measure the *hit area*, not the icon.
- **SC 1.4.13 Content on Hover or Focus** — a tooltip must appear on **focus**, not hover alone; stay
  while the pointer moves onto it; and dismiss with `Esc` without moving focus.
- **No horizontal scroll at 320 px**, and no content lost at 200% zoom.

## Pass 3 — screen reader, in pt-BR

NVDA or Narrator with a Portuguese voice. Listen to the whole flow, don't read the DOM.

- `<html lang="pt-BR">` in `index.html`. It was scaffolded `en` — until that is fixed, every screen
  reads Brazilian Portuguese through an English voice engine and is close to unintelligible.
- **Route announcement fires.** SPA navigation is silent by default: without the `aria-live` route
  announcer, the URL changes and the user hears nothing at all.
- **Accessible name vs visible label (SC 2.5.3).** The name must *contain* the visible text, in
  order. The trap in this codebase is the resting keycap: `<kbd>N</kbd>` inside the button makes it
  announce "Novo serviço N", and voice control users saying "Novo serviço" then get nothing.
  `aria-hidden="true"` on the `<kbd>` plus `aria-keyshortcuts` on the button. `role="presentation"`
  does not help — name-from-content still traverses the subtree.
- **Numbers, money and dates come from `Intl`**, so a screen reader says "R$ 1.234,50" as reais and
  "04/09/2026" as a date. A hand-built string reads as digits and slashes. → `agenza-ptbr-copy`
- **Landmarks and headings**: one `<main>`, each `<nav>` with a distinct `aria-label`, `aria-current="page"`
  on the active destination, and one `<h1>` per screen.

## Reporting the review

Order findings by pass, not by file. Each finding names: the control, the pass that caught it, the
failure a user actually hits, and the WCAG criterion if one applies. "Missing `aria-label`" is not a
finding; "the icon-only 'Sair' button announces as 'button', so voice control cannot activate it" is.

Say explicitly which passes you ran. A review that only ran pass 0 must say so.

| Need | Go to |
| --- | --- |
| The full itemised pass, region by region | [`references/checklist.md`](references/checklist.md) |
| The axe helper, the Playwright audit, what to assert | [`references/automation.md`](references/automation.md) |
| Building the primitive, keycap tiers, tokens | `agenza-ui-primitive` |
| pt-BR wording and `Intl` formatting | `agenza-ptbr-copy` |
