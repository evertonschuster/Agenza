# Accessible actions and focus

Use a button for an action and a link for navigation. An icon-only control needs an accessible name;
a labelled control's name should match its visible label. Decorative icons use `aria-hidden="true"`.
The action must remain understandable without a tooltip.

## Tooltips

Use the Base UI tooltip parts so content opens on focus as well as hover. Check the WCAG 1.4.13
behaviours after changing a wrapper:

- `Esc` dismisses the tooltip without moving the pointer.
- The pointer can move onto the tooltip without making it disappear.
- Content persists until dismissed, hover/focus leaves, or it is no longer valid.

A `title` attribute or a hover-only div does not replace this interaction or the control's accessible
name.

## Keyboard and focus

Preserve the Base UI part's focus trap, return focus, roving tabindex and keyboard navigation instead
of introducing parallel handlers. When overlays nest, verify that `Esc` dismisses the appropriate
overlay and focus returns to its trigger.

Retain a visible focus indicator; [tokens.md](tokens.md) covers its theme styling. Route focus and
announcements belong to the app shell, rather than each primitive.
