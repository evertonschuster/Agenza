# Feature-based architecture — applying it to a new app

A practical, standalone guide to the pattern already implemented in
`apps/admin-frontend`: organize by business feature (vertical), not by
technical file type (horizontal). Use this when bootstrapping a new frontend
app in this monorepo (`user-app`, `company-site` — docs/VISION.md) or as a
portable base for an unrelated new project.

This document is the *how*. It intentionally does not restate:

- **why** Agenza adopted it — `apps/admin-frontend/docs/adr/001-clean-architecture-layers.md`
  and `009-feature-based-modularization.md`;
- **the enforced rules** for changing admin-frontend today —
  `apps/admin-frontend/AGENTS.md`;
- **day-to-day task routing** inside admin-frontend —
  `.agents/skills/agenza-frontend-feature`;
- **what's actually implemented right now** — `apps/admin-frontend/docs/STATUS.md`.

Read this once when starting a new app or a new feature; read the four
references above when you need current rules, rationale, or status.

## The core idea

Two ways to organize the same codebase:

- **Horizontal (by file type):** top-level `components/`, `services/`,
  `hooks/`, `pages/`, `utils/`, each holding every feature's files side by
  side. A change to one business capability touches several unrelated
  top-level folders, and "what belongs to feature X" is answerable only by
  grep.
- **Vertical (by feature):** each business capability owns one folder
  containing everything it needs. A change to that capability stays inside
  its folder; the directory tree itself documents what the product does.

The horizontal split still applies *inside* a feature (its own internal
layers) — it just stops being the *primary* axis once an app grows past a
handful of verticals. That reversal — feature first, technical layer
second — is the whole pattern.

## The applied structure

Agenza's flavor combines feature-first grouping with Clean Architecture's
inward-only dependency rule, applied per feature instead of per top-level
directory:

```text
src/
  app/                     # bootstrap, routing, layouts, providers
    main.tsx
    App.tsx
    router.tsx             # lazy-loads each feature's routes
    providers/              # AppProviders — wiring only, no business logic
    composition/
      container.ts          # THE composition root (see below)

  features/
    <feature>/
      domain/                # entities, value objects, DomainError subclasses
      application/            # repository ports, use cases, orchestration
      infrastructure/          # concrete adapters: HTTP repos, mappers, decoders
      presentation/             # hooks, pages, forms for this feature
      index.ts                  # the feature's ONLY public surface

  shared/
    domain/                 # e.g. the base DomainError every feature extends
    application/             # cross-feature ports: HttpClient, event bus
    infrastructure/           # e.g. the authenticated HTTP client
    presentation/              # generic UI, hooks, providers with a genuine
                                # second identical consumer
```

Real, current examples of this exact shape: `src/features/auth/` and
`src/features/catalog/` in `apps/admin-frontend`.

### Dependency rule (inside a feature)

| Layer | May depend on | May not import |
| --- | --- | --- |
| `domain` | nothing else in the feature | React, HTTP, `application`, `infrastructure`, `presentation` |
| `application` | `domain` | React, `infrastructure`, `presentation` |
| `infrastructure` | `application` (implements its ports), `domain` | `presentation` |
| `presentation` | `application` (via hooks/facades), `domain` types | `infrastructure` directly |
| `app/composition` | everything | — it is the *only* place allowed to construct a concrete `infrastructure` class and hand it to `application` behind a port |

`domain` and `application` stay framework-agnostic and unit-testable without
a DOM, an HTTP mock, or a router. Swapping an HTTP client, an auth provider,
or a router touches only outer layers.

### The public-surface rule

Nothing outside `features/<feature>/` imports past that feature's
`index.ts` into its internal `domain/`, `application/`, or `infrastructure/`.
A feature that needs another feature's capability imports it through that
feature's `index.ts`, exactly like importing an external package.

`shared/` is not a default — a helper starts inside the feature that needs
it and is promoted to `shared/` only once a second, genuinely identical
consumer exists.

## Enforcement, not convention

A rule that only lives in prose erodes. Back it with two independent,
CI-blocking checks (mirror each other; one is IDE-fast feedback, the other
tooling-agnostic):

1. **Lint boundary** — an ESLint `no-restricted-imports` rule per feature
   that blocks any path reaching past `features/<feature>/index.ts`, and
   another blocking `domain`/`application` from importing React or a
   router.
2. **A structural guard script** — walks the source tree and fails on: (a)
   any import that reaches a feature's internal module from outside it, (b)
   a stale horizontal top-level directory (`domain/`, `application/`,
   `infrastructure/`, `presentation/` directly under `src/`) reappearing.
   `scripts/architecture_guard.py`'s `check_cross_feature_internal_imports`
   and `check_stale_horizontal_layout` in this repo are a working template —
   copy the pattern, not the Agenza-specific paths.

Wire both into the same CI gate as build/test so a boundary violation fails
the same way a broken test does.

## Bootstrapping a new app with this pattern

1. **Copy tooling, don't reinvent it.** Start from `apps/admin-frontend`'s
   `tsconfig`, `eslint.config.js`, `vitest.config.ts`, and `package.json`
   scripts (Vite + React + strict TypeScript + Vitest/RTL/MSW). Per
   docs/VISION.md, a new app in this monorepo copies this tooling unless an
   ADR justifies a divergence.
2. **Create the skeleton**: `src/app/{composition,providers}`,
   `router.tsx`, `src/features/` (empty), `src/shared/{domain,application,
infrastructure,presentation}`. Add `src/components/ui` and `src/lib/utils.ts`
   only if using shadcn/ui — those stay outside `shared/` by the CLI's own
   convention (don't hand-edit its generated imports).
3. **Build the first feature vertical end-to-end** (see next section) before
   adding a second — it proves the skeleton, the composition root, and the
   guard script all work together.
4. **Add the enforcement checks** from the section above before a second
   feature exists, not after — retrofitting a boundary onto code that
   already violates it is a much bigger diff than starting with it.
5. **Wire CI**: lint, typecheck/build, test with coverage, and the guard
   script as required checks. `.github/workflows/frontend-ci.yml` is a
   working reference if staying inside this monorepo.

## Adding a new feature to an existing app

1. Create `features/<feature>/{domain,application,infrastructure,
presentation}/` and an empty `index.ts`.
2. **Domain first**: entities/value objects and their `DomainError`
   subclasses; factories return `Result<Entity, DomainError>` instead of
   throwing on expected invalid input. Pure unit tests, no mocks.
3. **Application**: a repository port (interface) per external capability
   the feature needs. Add a use-case class only when it performs real
   orchestration or policy; a pure pass-through exposes the port method
   directly instead of an `execute` wrapper that adds nothing. Test against
   hand-written fakes that return `Result`.
4. **Infrastructure**: concrete adapters implementing the ports (HTTP
   repository, mappers/decoders that validate external data into domain
   types — wire data is untrusted even when a generated type looks
   narrower). Test against a mocked transport boundary (e.g. MSW) with one
   handler per request and unhandled requests treated as failures.
5. **Presentation**: hooks and pages that consume `application` only, never
   `infrastructure` directly. Test with a typed fake composition root,
   adding only the providers/wrappers the subject actually needs.
6. **`index.ts`**: export exactly the public surface — what other
   features/`app` may import, plus whatever the composition root needs to
   construct this feature's use cases. Nothing else is reachable from
   outside the feature.
7. **Composition root**: wire the concrete `infrastructure` implementation
   behind the `application` port in `app/composition/container.ts` (or
   equivalent); expose a grouped facade, never a raw repository or HTTP
   client.
8. **Route**: register the feature's routes in the app-level router,
   lazy-loaded by their own module path so bundlers keep them on separate
   chunks.
9. Run lint, build, test with coverage, and the structural guard before
   calling the feature done.

## Anti-patterns (the horizontal trap)

| Smell | Why it breaks down at scale | Fix |
| --- | --- | --- |
| Top-level `components/`, `services/`, `hooks/`, `utils/` holding every feature's files together | "What belongs to X" becomes a grep exercise, not a directory | Group by feature first; promote to `shared/` only on a genuine second identical use |
| Generic, config-driven, entity-agnostic CRUD page | Hides feature-specific rules behind indirection that's harder to change than three concrete pages | Build the smallest concrete page each feature actually needs |
| Importing another feature's internal file directly (`features/x/domain/...` from outside `x`) | Silently collapses the boundary the structure exists to create | Import only through the feature's `index.ts` |
| Business/validation logic inside a presentation component or an infrastructure adapter | Untestable without a DOM or a live API; hard to reuse | Push it down into `domain`/`application`; keep the outer layers thin |
| A catch-all `utils/` for anything that doesn't obviously fit | Becomes an unmaintainable dumping ground | Each helper belongs to the feature/layer that owns its concern, or to `shared/` if it's truly cross-cutting |
| A top-level `domain/`/`application/`/`infrastructure/`/`presentation/` reappearing beside `features/` | Reintroduces the horizontal layout the feature split replaced | Every feature-owned file lives under `features/<feature>/`; only genuinely cross-cutting code lives in `shared/` |

## Testing per layer

| Layer | Approach |
| --- | --- |
| `domain` | Pure unit tests, no mocks |
| `application` | Hand-written fakes returning `Result` values, not rejected promises for expected failures |
| `infrastructure` | Mock the transport boundary (e.g. MSW); one handler per request; unhandled requests fail the test |
| `presentation` | A typed fake composition root/container; add auth/router wrappers only when the subject needs them |

## Using this outside Agenza

What's portable to any new project, in any stack:

- Group by business feature first; technical layering is a second, internal
  axis.
- A one-directional dependency rule inside each vertical (core logic never
  imports its own delivery mechanism).
- One explicit public entry point per module — nothing reaches past it.
- A composition root: the only place concrete implementations meet the
  abstractions the core logic depends on.
- An automated, CI-blocking guard for the boundary — not just a convention
  a reviewer might miss.

What's Agenza-specific and safe to swap for a new context: the exact layer
names and count (docs/VISION.md already notes a simpler, smaller app can
use fewer layers than admin-frontend's four), shadcn/ui, the tenant-header
plumbing, the `Result`/`DomainResult` pattern, and OpenAPI-generated types
as the contract source.

## References

| Topic | Read |
| --- | --- |
| Why Agenza adopted this (rationale, consequences) | `apps/admin-frontend/docs/adr/001-clean-architecture-layers.md`, `009-feature-based-modularization.md` |
| Enforced rules for admin-frontend today | `apps/admin-frontend/AGENTS.md` |
| Day-to-day task routing inside admin-frontend | `.agents/skills/agenza-frontend-feature` |
| What's actually implemented right now | `apps/admin-frontend/docs/STATUS.md` |
| Planned new apps this guide is a base for | `docs/VISION.md` |
| Working enforcement-script template | `scripts/architecture_guard.py` |
