# Actions, tooltips and focus

Actions stay on visible controls. The header's **Buscar** button opens the command palette, a row's **Excluir** action opens its confirmation, and the confirmation's **Excluir** button performs the request.

## Accessible names

An icon-only control needs an accessible name. A labelled control's accessible name should match
its visible label. Decorative icons use `aria-hidden="true"`. Keep the action reachable and
understandable without relying on a tooltip.

## Tooltips under WCAG 1.4.13

Content that appears on hover or focus must be:

- **Dismissible** — `Esc` closes it without moving the pointer.
- **Hoverable** — the pointer can travel onto the tooltip without it vanishing.
- **Persistent** — it stays until dismissed, until hover/focus leaves, or until it is no longer valid.

It must open on **focus** as well as hover. Use the Base UI Tooltip part instead of a
`mouseenter`-only div or a `title` attribute. A tooltip is never the only carrier of an
accessible name.

## Focus

- Every interactive control needs a visible focus indicator; see the focus-ring section in
  [`tokens.md`](tokens.md).
- Focus return after a dialog closes, and the focus trap while it is open, belong to the Base UI
  part. Do not re-implement either.
- `Esc` closes the topmost overlay and returns focus to the control that opened it.
- Prefer the primitive's built-in keyboard behaviour (roving tabindex, typeahead, arrow navigation)
  over a `keydown` handler of your own.
- Route changes move focus to `<main tabIndex={-1}>` and announce through the live region — shell
  concerns, not primitive concerns.
