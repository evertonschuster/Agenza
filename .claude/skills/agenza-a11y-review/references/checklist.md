# The itemised pass

Work only the sections the screen actually has. A "Em breve" page has no form and no table; skipping
those sections is correct, silently passing them is not.

Every item is written as **the check** followed by *the failure a user hits*. If you cannot describe
the failure, you are reporting a lint rule, not an accessibility finding.

---

## 1. Document

- `<html lang="pt-BR">` in `index.html`. *An `en` value makes a Portuguese voice engine unavailable
  and the whole panel is read phonetically wrong.*
- One `<main>` per screen, with `tabIndex={-1}` so the skip link and the route change can move focus
  into it. *Without `tabIndex`, `element.focus()` silently no-ops and the skip link does nothing.*
- The skip link is the **first focusable element in the document** — before the header, before the
  theme toggle. *Placed after the nav, it saves nobody anything.*
- The skip link becomes visible when focused. *An `sr-only` class with no `focus:` counterpart means
  a sighted keyboard user sees the focus ring disappear on the very first `Tab`.*
- Title updates per route. *A screen reader user checking "where am I" via the window title hears the
  first route they ever loaded.*

## 2. Route change (SPA — the one nobody tests)

- A live region announces the new screen name. `aria-live="polite"`, present in the DOM **before** the
  text changes. *A region that is mounted at the same moment its text appears is frequently not
  announced at all — the region has to exist first, then receive content.*
- Focus moves to `<main>`. *Otherwise focus stays on the nav link: assistive tech keeps reading the
  previous page and the next `Tab` continues through the sidebar instead of the new content.*
- Scroll returns to the top. *Deep-scrolled list → new route → the new screen opens mid-page.*
- Nothing is announced twice. *A live region plus a focus move plus a `<h1>` change can produce three
  announcements for one navigation, which is worse than one.*

## 3. Navigation regions

- Sidebar and bottom bar each get a **distinct** `aria-label` on their `<nav>`. *Two unlabelled navs
  announce as "navigation, navigation" and the rotor is useless.*
- Active destination carries `aria-current="page"`. *Colour alone does not reach a screen reader.*
- When both bars render the same destinations at different widths, only one is in the accessibility
  tree at a time. *`hidden` via CSS class only (`md:hidden`) leaves both exposed, so every destination
  is announced twice.*
- Destinations without a backend are identifiable **before** activation, not only after. *Otherwise
  the user navigates, reads "Em breve", and goes back — every time.*
- No resting keycaps on nav items. Nav items occur many times per screen; the keycap rule forbids it.

## 4. Screen body

- Exactly one `<h1>`, and heading levels descend without skipping. *Screen reader users navigate by
  heading; a jump from `h1` to `h4` reads as missing content.*
- Icons that carry meaning have a text equivalent; purely decorative ones carry `aria-hidden="true"`.
  *An un-hidden icon font or `<svg>` can inject a junk character into the button's computed name.*
- Status colour is never the only signal. *A green dot and a red dot are the same dot.*
- An empty state is text, not just an illustration, and says what to do next in pt-BR.
- A list of actions per row: the accessible name distinguishes the row. *Twelve buttons all named
  "Editar" is a list a keyboard user cannot navigate.*

## 5. Overlays — dialog, sheet, menu, popover, tooltip, toast, command palette

- Opening moves focus into the overlay, onto the first meaningful control (not the close button when
  there is a field to type in).
- **`Esc` closes it and focus returns to the opener.** Check the return, not just the close. *After a
  failed restore, focus is on `<body>` and the next `Tab` starts the whole page again.*
- Focus is trapped inside a modal and cycles; `Tab` never reaches the page behind.
- The page behind is inert. *Without it, a screen reader in browse mode walks straight out of the
  dialog into content the sighted user cannot see.*
- The overlay has an accessible name (`aria-labelledby` pointing at its title).
- Tooltip: appears on **focus** as well as hover, stays while the pointer moves onto it, dismisses on
  `Esc` (SC 1.4.13). *Hover-only means keyboard users never see it; auto-dismiss on mouse-out means a
  low-vision user with a zoom tool cannot read it.*
- Tooltip content is never the control's only accessible name. *A tooltip is supplementary; if it
  carries the name, the control is unnamed while the tooltip is closed.*
- Toast: `role="status"` for confirmations, `role="alert"` only for errors. *`alert` interrupts
  whatever is being read; using it for "Salvo" is hostile.*
- Toast is reachable and dismissible by keyboard, and does not steal focus.
- Command palette: results are announced as they filter, the active option is tracked with
  `aria-activedescendant` rather than moving DOM focus out of the input.

## 6. Forms

- Every field has a `<label>` associated by `htmlFor`/`id`. *Placeholder-as-label vanishes on typing
  and is not a name.*
- Required is expressed to assistive tech (`required` / `aria-required`), not only by an asterisk.
- Field errors are linked with `aria-describedby` and the field carries `aria-invalid`. *An error
  paragraph next to a field is invisible to a screen reader on that field.*
- Server validation errors reach a live region on submit, and focus moves to the first invalid field.
  *Otherwise a 400 renders errors the user never learns exist.*
- Error text comes from `result.error.errors` keyed by field — never from parsing a free-text message.
- On mobile, inputs are ≥16 px so focusing does not zoom the viewport.
- Fieldsets/legends for grouped radios or checkboxes.

## 7. Shortcuts and keycaps

- Single-character shortcuts can be switched off by user preference (SC 2.1.4). *Speech-input users
  emit stray characters constantly; a live `n` binding makes the panel unusable for them.*
- Shortcuts do not fire while focus is in a text field or a `contenteditable`.
- With shortcuts off, `Ctrl/⌘+K` and `Esc` still work, and **no hints are rendered** anywhere.
- Matching uses `event.key`. *`event.code` is physical-layout based and mismatches ABNT2, so the
  shortcut you documented is not the key the user presses.*
- A resting keycap appears only on a control that occurs at most once per screen — header search,
  the screen's single primary CTA, a dialog's confirm. Never on destructive actions, row actions or
  nav items.
- The keycap is `<kbd aria-hidden="true">` and the button carries `aria-keyshortcuts`. *Without the
  hiding, the computed name becomes "Novo serviço N": the visible label is no longer contained in the
  accessible name (SC 2.5.3), and voice control saying "Novo serviço" fails to match.*
- Keycaps do not render on devices with no plausible keyboard.

## 8. Motion and preferences

- `prefers-reduced-motion` removes transitions rather than merely shortening them.
- Nothing auto-advances, auto-dismisses under 5 s, or animates on a loop without a way to stop it.

---

## WCAG 2.2 criteria that actually bite this panel

Level AA. These are the ones a sticky-header admin shell fails; the rest of the AA set is largely
handled by using the primitives correctly.

| SC | Name | Where it bites here |
| --- | --- | --- |
| 1.4.3 / 1.4.11 | Contrast (text / non-text) | Must be measured **in both themes**; a token tuned in light routinely fails in dark |
| 1.4.13 | Content on Hover or Focus | Tooltips: must appear on focus, be hoverable, dismiss with `Esc` |
| 2.1.1 / 2.1.2 | Keyboard / No Keyboard Trap | Hand-rolled overlays trap; `div` handlers are unreachable |
| 2.1.4 | Character Key Shortcuts | `/`, `?`, `n` must be switchable off |
| 2.4.3 | Focus Order | Responsive reflow moves controls visually without moving them in the DOM |
| 2.4.7 | Focus Visible | Every stop, every surface, both themes |
| 2.4.11 | Focus Not Obscured | **Sticky header and bottom nav** — the single most likely failure in this shell |
| 2.4.13 | Focus Appearance | The two-tone ring exists for this; verify it survives on the brand violet |
| 2.5.3 | Label in Name | The keycap-inside-the-button trap |
| 2.5.8 | Target Size | Bottom nav and row action buttons at 375 px |
| 3.2.6 | Consistent Help | The help sheet reachable the same way from every screen |
| 4.1.3 | Status Messages | Toasts and the route announcer |

## Not findings — don't file these

- A `<div>` with no role that is not interactive and not focusable.
- A missing `alt` on an image already labelled by adjacent text and marked `aria-hidden`.
- axe's `region` rule firing on a component rendered in isolation in a unit test — that is a test
  harness artefact, not a screen defect.
- `aria-label` on an element that already has a correct visible label. Redundant, but the fix is to
  delete it, not a11y debt worth a row in the report.
