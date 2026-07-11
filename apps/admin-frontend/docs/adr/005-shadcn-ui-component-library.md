# ADR 005 — shadcn/ui as the component library

**Status:** Accepted

## Decision

Build interactive UI components (`Button`, `Card`, `Input`, `Textarea`,
`Label`, `Spinner`, `Table`, `Dialog`, and any future primitive) from
shadcn/ui: Radix UI primitives styled with Tailwind, copied into
`src/components/ui/` via the shadcn CLI, not installed as an opaque npm
package. The theme itself (`src/index.css`'s `:root`/`.dark` tokens) is
also CLI output, not hand-picked — see Consequences.

## Rationale

Options evaluated: shadcn/ui, Mantine, Chakra UI, MUI, Ant Design, and
hand-building directly on unstyled Radix/Headless UI primitives.

The deciding factor was styling-system fit. This project is styled
entirely in Tailwind utility classes (`src/index.css`, CSS-variable
theming, no `tailwind.config.js`). Mantine, Chakra, MUI, and Ant Design
each ship their own styling engine (CSS Modules, Panda CSS, style props,
or Emotion CSS-in-JS) that would run _alongside_ Tailwind in the same
codebase — two ways to style a page, real specificity/duplication
friction, and in MUI/Ant Design's case a strong pre-existing visual
identity that fights a from-scratch design language.

shadcn/ui is the only option that adds zero competing styling system:
its CLI copies component source directly into the repo as Tailwind
classes over Radix UI primitives (accessibility — focus trapping,
keyboard nav, ARIA — solved by Radix, not hand-rolled). Copying source in
rather than installing a package also means full ownership if a real
need arises later: no waiting on an upstream release for a fix, no
breaking version bump. Until then, generated files are kept close to
the registry output rather than pre-emptively extended — there's no
strict design spec yet, so added props/variants a page doesn't use are
just surface area to maintain.

Bare Radix/Headless UI (no shadcn) was the runner-up — same accessibility
and zero styling conflict — but shadcn's CLI gives a working starting
component instead of an empty primitive, which matters for a solo/small
team building six more feature verticals.

## Consequences

- Adding a new primitive is `npx shadcn@latest add <name> -c apps/admin-frontend`,
  not `npm install` — requires network access to the shadcn registry at
  dev time (not at runtime/build time for already-added components).
- Every generated file must be checked against this project's
  `exactOptionalPropertyTypes: true` — the registry doesn't target that
  strictness level, and at least one generated component
  (`dropdown-menu.tsx`) failed to type-check as-is and was removed
  rather than patched, since it wasn't needed yet.
- Prefer the registry output as-is; only add a prop or variant to a
  generated file when a page genuinely needs it right now (see
  `Card`'s `size="sm"` for an example of a justified, minimal
  addition). Don't extend a component speculatively for a use case
  that doesn't exist yet — it's easier to add later than to carry
  unused surface area.
- `table.tsx` is styling only — semantic `<table>` markup with Tailwind
  classes, no sorting/pagination/virtualization. Fine for the flat
  record lists this project has today; pairs with a separate library
  (e.g. TanStack Table) if a future vertical needs those behaviors.
- The whole component set depends on the CSS-variable tokens in
  `src/index.css` for both theming and dark mode — see the "Design
  language" and "UI component library" entries in `docs/DECISIONS.md`.
  To regenerate those tokens from scratch (e.g. after a manual edit
  drifted from the registry), run
  `npx shadcn@latest init -y -f -b radix -p nova --no-reinstall -c apps/admin-frontend`
  from the repo root — it rewrites `src/index.css`'s tokens and
  `src/lib/utils.ts` without touching already-added components. It has
  also been observed to add an unrequested `@fontsource-variable/geist`
  dependency and duplicate `@import` lines on rerun — check `git diff`
  after running it and remove both before committing.
