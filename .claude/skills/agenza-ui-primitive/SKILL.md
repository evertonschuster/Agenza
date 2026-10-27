---
name: agenza-ui-primitive
description: Add or change shared UI primitives in the admin frontend, including Base UI composition, generated components, theme tokens and accessible interactions.
---

# Shared UI primitives

Use the [frontend architecture](../../../apps/admin-frontend/docs/ARCHITECTURE.md) for layer boundaries
and component organization. Primitives can own interaction state and behaviour; domain rules and API
requests belong to the feature that uses them.

## Reuse and composition

Search `src/shared/ui/` for the role and existing variants before adding a component. Read
[`button/index.tsx`](../../../apps/admin-frontend/src/shared/ui/button/index.tsx) for the local cva,
`data-slot`, `data-variant` and `data-size` conventions.

The library is Base UI. Compose its parts with `render`, rather than Radix's `asChild`/`Slot`:

```tsx
<DialogClose render={<Button variant="outline" />}>Fechar</DialogClose>
```

Use `ActionButton` for actions and `ActionLink` for navigation styled as a button. `ActionButton`'s
`pending` state supplies the spinner and prevents activation while retaining focus. Preserve Base
UI's keyboard and focus behaviour when wrapping a part.

## Generate when needed

From `apps/admin-frontend/`, use the existing CLI pin:

```bash
npx shadcn@4.21.0 add <name>
```

[`components.json`](../../../apps/admin-frontend/components.json) selects the `base-nova` registry
style and the local aliases. The documentation site's library tab does not configure the CLI.
The CLI pin does not freeze registry component source: review the generated code and dependency diff.

- Move flat generated output into the component folder required by the architecture; split types and
  subparts when their contents justify it.
- Use `@/shared/lib/utils` for `cn`. The existing bare-`cn` aliases can make generated imports compile
  while an unwanted npm dependency remains; remove that dependency if the CLI adds it.
- Check for unexpected Radix dependencies and use the configured Lucide icons.
- For dependency changes, follow the single [lockfile procedure](../../../apps/admin-frontend/README.md#lockfile).

## Adapt the output

Check the [TypeScript configuration](../../../apps/admin-frontend/tsconfig.json). In particular,
`exactOptionalPropertyTypes` requires `prop?: T | undefined` when a forwarded optional value can be
`undefined`; `verbatimModuleSyntax` requires type imports, and `noUncheckedIndexedAccess` requires
handling a missing indexed value.

For styling, read [tokens.md](references/tokens.md): semantic utilities, attribute-driven themes,
overlay transitions and backend-supplied colours. For tooltips, accessible names and focus, read
[interaction.md](references/interaction.md).

## Verify the changed behaviour

Assert the visible or accessible effect of a changed prop or interaction, rather than only rendering
it without an error. Exercise pending/disabled states, keyboard operation and focus when affected.
Check both themes for visual changes.

Read [`vitest.config.ts`](../../../apps/admin-frontend/vitest.config.ts) for the current coverage
exclusions. They name individual paths; `shared/ui/` has no blanket exemption. An exclusion neither
forbids local UI behaviour nor removes the need to test a meaningful regression.

Run the relevant checks from the [frontend README](../../../apps/admin-frontend/README.md#comandos).
