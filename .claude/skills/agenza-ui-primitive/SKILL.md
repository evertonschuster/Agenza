---
name: agenza-ui-primitive
description: Use when adding, replacing or restyling anything under apps/admin-frontend/src/shared/ui/ — running `npx shadcn add`, writing a cva variant, wiring a Base UI part, choosing between semantic tokens, rendering a backend-supplied tag colour, or deciding whether a control gets a resting keycap.
---

# Adding or changing a primitive in `shared/ui/`

`src/shared/ui/` is **owned source**, not a dependency. Presentational only: no business rule, no
`features/` import, no API call. Anything with behaviour worth testing does not belong here (§6).

Architecture: [`docs/ARCHITECTURE.md`](../../../apps/admin-frontend/docs/ARCHITECTURE.md) §1.
Decisions driving this layer: [`specs/002-ui-foundation/plan.md`](../../../apps/admin-frontend/specs/002-ui-foundation/plan.md) D1, D4, D5.

## 0. Base UI, not Radix — read this before pasting anything

The primitive layer is `@base-ui/react` (ADR 0039). **A Radix snippet from a tutorial does not
compile here.** Radix composes with `asChild` + `Slot`; Base UI composes with a `render` prop.

```tsx
<Button asChild>                       {/* Radix — no `asChild` prop exists */}
  <Link to="/agenda">Agenda</Link>
</Button>

<Button render={<Link to="/agenda" />}>Agenda</Button>   {/* Base UI */}
```

On the shadcn docs site, **switch to the Base UI tab** before copying. In the shadcn MCP, pass the
Base UI registry — `list_items_in_registries` / `view_items_in_registries` / `get_add_command_for_items`.

`src/shared/ui/button.tsx` is the reference for the cva + `data-slot`/`data-variant`/`data-size`
conventions. Until T052 of `specs/002-ui-foundation/tasks.md` lands it is also the app's last
`radix-ui` consumer — read it for the conventions, never for `asChild`.

## 1. Check whether it already exists

Look in `src/shared/ui/` and grep for the role, not the name (`grep -ri "role=\"dialog\"" src/shared/ui`).
**Prefer a new cva variant on an existing primitive over a new file.** A second button-shaped
component is the most common wrong answer here.

## 2. Add it with the CLI, from `apps/admin-frontend/`

```
npx shadcn@latest add <name>
```

`components.json` already remaps the aliases: components land in `@/shared/ui`, `cn()` resolves to
`@/shared/lib/utils`, hooks to `@/shared/hooks`. Do not hand-copy files from the docs — you lose the
alias rewrite and end up with `@/components/ui` imports that fail the path check.

Two things to verify right after: the CLI did **not** add `radix-ui` back to `package.json`, and any
icon it pulled comes from `lucide-react`. If you added or bumped a dependency, regenerate
`package-lock.json` in a Linux container (`npm install --package-lock-only --ignore-scripts`) —
regenerated on Windows, `npm ci` breaks CI on `@tailwindcss/oxide` native bindings.

## 3. The typing pass — expect it on every component

`exactOptionalPropertyTypes` is on. Generated components spread props through, so an optional prop
whose value may be `undefined` **fails to assign**. This is routine, not occasional:

```tsx
type KbdProps = { keys: string[]; tone?: 'muted' | 'brand' };
<Kbd keys={keys} tone={maybeTone} />   // Type 'undefined' is not assignable to '"muted" | "brand"'
```

Write the `| undefined` explicitly: `tone?: 'muted' | 'brand' | undefined`.

Two more that bite generated files: `verbatimModuleSyntax` (a type import must say `import type` /
`{ type X }`) and `noUncheckedIndexedAccess` (`keys[0]` is `string | undefined`).

Then strip what the generator adds and the repo forbids: **no JSDoc, no "what" comments.**

## 4. The style pass — semantic tokens only

`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, `ring-ring`. **A raw palette
class (`bg-neutral-900`, `text-white`, `#hex`) breaks theme portability** — it will not flip with
`data-theme` and it will look wrong in one of the two themes.

Dark is an **attribute** variant, not a media query. Writing `@media (prefers-color-scheme: dark)`
in a component breaks explicit light-on-a-dark-OS, which is a supported state.

Full token system, focus ring, dark elevation, and the backend-hex technique:
[`references/tokens.md`](references/tokens.md).

## 5. If it is an action — pick its keycap tier

A **resting** keycap only on a control that occurs at most once per screen: the header search, the
screen's single primary CTA, a dialog's confirm. Everything else is tooltip on hover **and** focus,
or palette/help-sheet only. **Never** on destructive actions, row actions, or nav items.

The keycap is **derived from the shortcut registry**, never typed by hand — there is no `shortcut`
prop on the generic `Button`.

Accessible name, non-negotiable: `<kbd aria-hidden="true">` inside the button plus
`aria-keyshortcuts` on the button. `role="presentation"` does **not** work — name-from-content still
traverses the subtree, and the button announces as "Novo serviço N".

Tiers, tooltip rules under WCAG 1.4.13, `event.key` vs `event.code`, focus:
[`references/interaction.md`](references/interaction.md).

## 6. Tests and coverage

`src/shared/ui/**` is excluded from coverage in `vitest.config.ts`. **Coverage measures logic, not
cva markup** — presentational primitives have nothing to assert, and counting them pushes the team
toward ceremonial tests.

The exclusion is not permission to skip testing behaviour. It is the boundary that tells you where
behaviour belongs: **anything with logic goes in `shared/` proper** (`shared/theme/`,
`shared/keyboard/`, a hook), where it is measured, and the primitive stays a dumb renderer of it.
A test is still worth writing for an accessible name that a regression could silently break.

## 7. Before you push

`npm run lint && npm run format:check && npm run build && npm run test:coverage`, from
`apps/admin-frontend/`. New visible strings are pt-BR; identifiers stay English. Every interactive
control has an accessible name; decorative icons carry `aria-hidden`.
