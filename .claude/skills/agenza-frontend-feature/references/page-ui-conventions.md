# Page and UI conventions

Read only for page, form, dialog, table, component, or visual changes.

## Composition

- Routed pages are composition shells over focused controller hooks.
- Split independent workflows; do not use line count as an abstraction rule.
- Extract a concern locally first and promote it to `shared/` only after a real
  second identical use.
- Reuse primitives and behaviors, not a generic entity-configured CRUD page.
- Inspect the current Categories implementation instead of copying a documented
  folder snapshot.

## Forms and interaction

- Prefer existing shadcn/ui and shared presentation components.
- Use React Hook Form + Zod for non-trivial forms and map structured backend
  field/code errors through the shared helper.
- Focus the first invalid field; never parse free-text backend messages.
- Use the shared destructive confirmation flow instead of `window.confirm`.
- Keep inline-create pending/error state separate from the outer form.

## Accessibility and responsive behavior

- Every interactive control has an accessible name and keyboard operation.
- Prefer Radix behavior over custom keyboard logic; decorative icons are hidden
  from assistive technology.
- Verify light/dark themes, 375 px width, overflow, and focus movement.
- Use semantic design tokens, not raw palette colors.
- User-visible and assistive strings are pt-BR; code identifiers remain English.
