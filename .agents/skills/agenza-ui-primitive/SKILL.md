---
name: agenza-ui-primitive
description: Adds or changes shared admin-frontend UI primitives — Base UI composition, shadcn-generated components, theme tokens, tooltips and focus (componente, botão, diálogo, tema, cor). Use when shared/ui or the theme changes. Not for copy (agenza-ptbr-copy) or feature screens (agenza-frontend-slice).
---

# Shared UI primitives

The [frontend architecture](../../../apps/admin-frontend/docs/ARCHITECTURE.md) owns layers and
component organization. A primitive may own interaction state; domain rules and API calls belong to
the feature that uses it.

## Reuse and compose

Search `src/shared/ui/` for the role and its variants before adding a component, and read
[`button/index.tsx`](../../../apps/admin-frontend/src/shared/ui/button/index.tsx) for the local cva,
`data-slot`, `data-variant` and `data-size` conventions. The library is Base UI: compose parts with
`render`, not Radix's `asChild`/`Slot`:

```tsx
<DialogClose render={<Button variant="outline" />}>Fechar</DialogClose>
```

`ActionButton` is for actions and `ActionLink` for navigation styled as a button; `ActionButton`'s
`pending` supplies the spinner and blocks activation while keeping focus.

## Generate when needed

From `apps/admin-frontend/`, with the CLI version pinned here (this line is its only source):

```bash
npx shadcn@4.21.0 add <name>
```

[`components.json`](../../../apps/admin-frontend/components.json) selects the `base-nova` style and the
local aliases. The pin does not freeze registry source, so review the generated code and dependencies:

- Move flat output into the component folder the architecture requires.
- Import `cn` from `@/shared/lib/utils`. The bare-`cn` aliases let generated imports compile while an
  unwanted npm dependency stays; remove it if the CLI adds it.
- Remove unexpected Radix dependencies and use the configured Lucide icons. Dependency changes follow
  the [lockfile procedure](../../../apps/admin-frontend/README.md#lockfile).

## Style, focus and keyboard

Tokens, themes, overlay transitions and backend colours: [tokens.md](references/tokens.md).

- An icon-only control needs a pt-BR accessible name; a labelled control's name matches its visible
  label; decorative icons use `aria-hidden="true"`. The action must make sense without a tooltip.
- Use the Base UI tooltip parts so content opens on focus as well as hover; after changing a wrapper,
  check that `Esc` dismisses it, the pointer can move onto it, and it stays until dismissed. A `title`
  attribute is not a tooltip.
- Keep the part's focus trap, focus return, roving tabindex and keyboard navigation instead of parallel
  handlers. With nested overlays, `Esc` closes the right one and focus returns to its trigger.
- `element.focus()` does not trigger `:focus-visible`; debug focus rings with a real click or Tab.
  Controls nested in `input-group` need `ring-offset-0` beside `ring-0`.

## Verify

Assert the visible or accessible effect of a changed prop or interaction, including pending/disabled
states, keyboard operation and focus when affected, and check both themes for visual changes. From
`apps/admin-frontend/`, run the affected tests, `npm run lint` and `npm run build`, fix and repeat; finish
with `npm run test:coverage` ([agenza-testing](../agenza-testing/SKILL.md) for coverage scope).
