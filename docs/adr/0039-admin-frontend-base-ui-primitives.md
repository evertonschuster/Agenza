# ADR 0039 — admin-frontend adopts Base UI as the primitive layer, replacing Radix

Status: accepted (2026-09)

## Context

The admin-frontend constitution lists "UI component library" under **Explicitly Deferred
Decisions**, and requires that a plan which settles one of those record the decision
explicitly. [ADR 0038](0038-admin-frontend-remove-categories-harness.md) cleared the
protected area precisely so the real UI direction could be built into it. This is that
decision.

The app currently depends on `radix-ui` — the unified package — and consumes exactly one
primitive from it: `Slot`, used by `src/shared/ui/button.tsx` to implement `asChild`.
`shared/ui/` holds two files in total. `components.json` is already configured for the
shadcn CLI, with aliases remapped to `@/shared/ui` and `@/shared/lib`.

In July 2026 shadcn/ui made **Base UI** (`@base-ui/react`) its default primitive layer.
New projects get Base UI from `shadcn init`; the documentation opens on the Base UI tab;
blocks ship for both. Radix was **not** deprecated — `shadcn init -b radix` remains
supported and every component continues to ship for both libraries.

Two facts made the timing decisive rather than fashionable:

- The migration cost is currently **one file**. `button.tsx` is the only Radix consumer,
  and the whole UI is being discarded and rebuilt under `specs/002-ui-foundation/`
  regardless. This cost will never be lower again, and it grows with every primitive added.
- Base UI ships **Toast** and **Combobox** in the same package. Under Radix, the planned
  foundation needed `sonner` for toasts and `cmdk` for the command palette. Those two
  dependencies disappear.

## Decision

Replace `radix-ui` with `@base-ui/react` as the primitive layer for `src/shared/ui/`.

Components continue to be **owned source** in `src/shared/ui/`, added via the shadcn CLI
against the existing `components.json`. This is unchanged from the previous arrangement and
is the part of it worth keeping: owned source over a black-box dependency.

`sonner` and `cmdk` are not adopted. Toast and Combobox come from Base UI.

The foundation set is deliberately small — surfaces, overlays, inputs, and a keycap
component. Everything else is added when a screen actually needs it.

## Consequences

- **Base UI uses a `render` prop where Radix used `asChild` + `Slot`.** Any snippet copied
  from a Radix tutorial, or from a pre-2026 shadcn answer, fails to compile. Contributors
  must use the Base UI tab of the shadcn documentation. The `agenza-ui-primitive` skill
  states this as its first warning; it is the single most likely source of wasted time.
- `button.tsx` is rewritten. Its extended size set and its `data-slot` / `data-variant` /
  `data-size` attributes are preserved — those are ours, not Radix's.
- Adding the dependency requires regenerating `package-lock.json` inside a Linux container
  (`npm install --package-lock-only --ignore-scripts`), or CI's `npm ci` fails on the
  `@tailwindcss/oxide` native bindings. This is a standing constraint of this repository,
  not specific to this change.
- `exactOptionalPropertyTypes` friction is unchanged and remains per-component: CLI-generated
  components spread props through and frequently need `X | undefined` written explicitly.
- `src/shared/ui/**` is added to `coverage.exclude` in `vitest.config.ts`. Presentational
  primitives built from `cva` have no logic to test, and holding them to the 85% gate would
  buy ceremonial tests rather than confidence. The corollary is load-bearing and is enforced
  by review, not by tooling: **anything with behaviour does not belong in `shared/ui/`** — it
  belongs in `shared/`, where it is measured. This exclusion must land *before* any primitive
  is added, or CI turns red in a way that reads as a regression.
- Radix remaining supported upstream means this decision is reversible at roughly the cost of
  the components written by then. It is not a lock-in.
- This closes "UI component library" in
  [`apps/admin-frontend/.specify/memory/constitution.md`](../../apps/admin-frontend/.specify/memory/constitution.md).

## Alternatives considered

**Stay on Radix.** Zero immediate work, and Radix is mature and maintained. Rejected because
it puts the project on the non-default path of its own component CLI — every future
`shadcn add` would need the `-b radix` flag and every doc page would need a tab switch — while
keeping `sonner` and `cmdk` as dependencies that Base UI would have made unnecessary. The cost
of switching only grows.

**A dependency-style library (Mantine, HeroUI, Chakra).** Rejected on the grounds already
recorded for shadcn/ui: owned component source beats a black-box dependency for an admin panel
whose visual direction is still being set.

**React Aria Components.** Strongest accessibility story of the candidates. Rejected because it
is not what the project's component CLI targets, so every component would be hand-authored
against a different API than the documentation the team reads.
