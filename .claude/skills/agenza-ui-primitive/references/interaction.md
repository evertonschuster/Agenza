# Shortcut evidence, tooltips and focus

The rule this file exists to protect
([`specs/002-ui-foundation/plan.md`](../../../../apps/admin-frontend/specs/002-ui-foundation/plan.md) D4):

> A **resting** keycap may appear only on a control that occurs **at most once per screen**.

The discovery benefit is paid once per user. The noise cost is paid per instance, forever. Ten
keycaps on a list screen teach nobody anything and make the screen look like a keyboard.

## The four tiers

| Tier | Where | How it shows |
| --- | --- | --- |
| **A** | Header search; the screen's single primary CTA; a dialog's confirm | Resting keycap, in the trailing slot, **never inside the label text** |
| **B** | Icon buttons and secondary actions that have a shortcut | Tooltip on hover **and** focus, 250 ms delay |
| **C** | Everything else that has a shortcut | Command palette right-rail and the `?` help sheet only |
| **D** | No shortcut | Nothing |

**Never tier A or B on**: destructive actions, row actions inside a list or table, navigation items.
A destructive action should be slower to reach, not faster.

The keycap is **derived from the shortcut registry** (`shared/keyboard/`), never typed by hand, and
there is no `shortcut` prop on the generic `Button`. That is what makes it structurally impossible to
advertise a shortcut that does not exist.

## Accessible name — the failure everyone hits

A keycap is decoration sitting inside a button's content. Name-from-content walks the whole subtree.

```tsx
<Button aria-keyshortcuts="n">
  Novo serviço
  <kbd aria-hidden="true">N</kbd>
</Button>
```

- `aria-hidden="true"` on the `<kbd>` — this is what prunes it from the accessibility tree.
- `aria-keyshortcuts` on the **button**, not on the `<kbd>`, and **never inside `aria-label`**.

**`role="presentation"` does not work.** It removes the element's own semantics but leaves its text
in the subtree, so name computation still traverses it and the button announces as
"Novo serviço N". Only `aria-hidden` prunes.

Value format for `aria-keyshortcuts`: space-separated combinations, `+` inside one, canonical key
names — `"Control+K"`, `"Shift+?"`, `"n"`.

Worth a test: assert the computed accessible name equals the visible label. It is the exact
regression a later keycap addition causes silently.

## Rendering gate

A keycap on a phone is a lie. Hints render only when:

```
shortcutsEnabled AND ( ((hover: hover) and (pointer: fine))  OR  html[data-kbd] )
```

`data-kbd` is set on `<html>` at the first real keydown, to rescue a tablet with an attached
keyboard — which reports `pointer: coarse`. **Never** branch on `navigator.maxTouchPoints`: a
touchscreen laptop is the counter-example and it is common.

`shortcutsEnabled` is a user preference (WCAG 2.1.4 Character Key Shortcuts). Off means single-key
handlers are removed **and** every hint disappears; `Ctrl/⌘+K` and `Esc` keep working, because they
are modified or reserved keys.

## Tooltips (tier B) under WCAG 1.4.13

Content that appears on hover or focus must be:

- **Dismissible** — `Esc` closes it without moving the pointer.
- **Hoverable** — the pointer can travel onto the tooltip without it vanishing.
- **Persistent** — it stays until dismissed, until hover/focus leaves, or until it is no longer valid.
  No auto-hide timer.

And it must open on **focus**, not only hover — a tooltip that never appears for a keyboard user is
tier C wearing a costume.

Use the Base UI Tooltip part, which already satisfies these. Hand-rolling a `title` attribute or a
`mouseenter`-only div fails all four points at once, and `title` is unreachable by keyboard.

A tooltip is never the only carrier of an accessible name. Name the control, then let the tooltip
add the shortcut.

## Key matching: `event.key`, never `event.code`

The users are on Brazilian ABNT2 keyboards. `event.code` names a **physical** key position derived
from the US layout, so `/` and `?` land on positions that do not match what the user pressed. Match
on `event.key`, which is the character the layout actually produced.

Single-character shortcuts must not fire while typing. Suppress in `input`, `textarea`,
`[contenteditable]`, `[role="textbox"]`, and while a dialog is open. This is in
`shared/keyboard/shortcuts.ts` — a primitive should never attach its own document listener.

## Focus

- Every interactive control needs a visible focus indicator; see the focus-ring section in
  [`tokens.md`](tokens.md).
- Focus return after a dialog closes, and the focus trap while it is open, belong to the Base UI part.
  Do not re-implement either — a hand-rolled trap is where keyboard users get stuck.
- `Esc` closes the topmost overlay and returns focus to the control that opened it.
- Prefer the primitive's built-in keyboard behaviour (roving tabindex, typeahead, arrow navigation)
  over a `keydown` handler of your own. A custom handler on top of a Base UI part usually fights it.
- Route changes move focus to `<main tabIndex={-1}>` and announce through the live region — shell
  concerns, not primitive concerns, but a primitive that steals focus on mount will break them.
