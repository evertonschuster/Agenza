# ADR 0042 — admin-frontend `widgets/` layer and the `layer-boundaries` lint rule

Status: proposed (2026-09)

> Draft reconstructed from the code of PR #125 and `apps/admin-frontend/docs/ARCHITECTURE.md` during
> its review. The rationale below is inferred from what was built — confirm or correct it, and settle
> the open question at the end, before marking this accepted.

## Context

Two generic pieces of UI came out of the tags work: `ConfirmDialog` (confirm / blocked /
transient-retry states and the success toast) and `ListSection`
(loading / error / empty / ready, table or list rendering). Both started under `shared/ui/`.

Neither fits there. `shared/ui/` holds presentational primitives over Base UI and is excluded from
the coverage gate on exactly that premise — `agenza-testing` says it directly: *"if a thing has
behaviour, it does not belong in `shared/ui/`"*. `ConfirmDialog` owns submission state and
classifies failures with `isTransientProblem`; `ListSection` owns the state switch that keeps "did
not load" from rendering as "empty". Neither belongs to `features/tags` either: nothing in them
knows what a tag is, and the next confirmation or listing would have to reach into another slice.

The dependency direction was enforced by three `no-restricted-imports` blocks in
`eslint.config.js`. That mechanism could only match `@/…` specifiers (a relative import past a
barrel went unseen), and flat config **replaces** `no-restricted-imports` in a later matching block
instead of merging it, so every block had to restate the barrel ban — a trap documented in three
places. Adding a fourth layer meant another block restating everything.

## Decision

1. **A `src/widgets/` layer** holds generic UI compositions that carry behaviour but no domain
   knowledge. Direction: `app → features → widgets → shared`. A widget imports only `shared/`;
   a feature may import widgets; nothing imports upward.
2. **One custom ESLint rule, `agenza/layer-boundaries`**
   (`apps/admin-frontend/eslint-rules/layerBoundaries.js`, covered by its own `RuleTester` test),
   replaces the three blocks. It resolves `@/` and relative specifiers — static imports, re-exports
   and literal dynamic `import()` — to a layer, reports any import into a higher layer, and, for
   sliced layers (`features`), reports an import of another slice that goes past its `index`.

## Consequences

- The layer order lives in one option (`layers: ['app', 'features', 'widgets', 'shared']`); the
  flat-config replace-not-merge trap is gone.
- Relative imports past a feature barrel are now caught; before, only the `@/` form was.
- **Not checked:** files outside the four layers — `src/main.tsx`, `src/test/**`, `e2e/**` and
  config files. The old base block banned `@/features/*/*` there too; today review covers them.
  Extending the rule's `locate()` is the fix if that ever matters.
- Imports inside a slice are exempt in any form, including `@/features/<same slice>/…`, which the
  old base block banned.
- `widgets/` is not sliced: a consumer can import a widget's `components/` directly. The
  `index.tsx`-only convention for sub-parts stays a review rule, as it is for `shared/ui/`.
- Widgets carry behaviour, so by this ADR's own premise they belong under the coverage gate.
  `vitest.config.ts` currently excludes `src/widgets/list-section/**`; revisit that exclusion.

## Alternatives considered

- **Keep both in `shared/ui/`** — contradicts the premise the coverage exclusion rests on.
- **Keep them in `features/tags`** — they are domain-blind, and the next feature needing a
  confirmation or a listing would import across slices.
- **A fourth `no-restricted-imports` block** — works for `@/` specifiers, keeps the restating trap,
  and still misses relative imports.

## Open question before accepting

The name inverts canonical Feature-Sliced Design, where `widgets` sit **above** `features` and
compose them into page sections. Here a widget is a domain-blind building block that a feature
composes. Either keep the name and state the inversion (as this ADR does), or rename the layer so
it cannot be read with the FSD meaning.
