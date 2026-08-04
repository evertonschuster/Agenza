# ADR 009 — Feature-based frontend modularization

**Status:** Accepted and executed 2026-07-23. This document records the current
boundary only; feature progress belongs in `docs/STATUS.md`.

## Decision

```text
src/
├── app/                       bootstrap, providers, layouts, routes, composition
├── features/<feature>/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── index.ts              public feature API
├── shared/                    proven cross-feature primitives/boundaries
├── components/ui/             shadcn-generated primitives
└── lib/                       shadcn utility location
```

- Dependencies point inward inside each feature.
- Code outside a feature imports only through that feature's `index.ts`, except
  narrow test infrastructure and route lazy-loading rules enforced by ESLint.
- `app/composition/` is the sole place allowed to construct concrete
  infrastructure.
- Feature-specific DTOs, forms, hooks, view models, and tests remain inside the
  feature.
- A primitive moves to `shared/` only after a real second identical use or when
  it is an application-wide boundary by nature.
- Unimplemented routes remain small `app/pages` placeholders; do not scaffold
  empty domain/application/infrastructure layers for them.
- Generic entity-configured CRUD pages are prohibited; reuse behaviors and UI
  primitives instead.

## Enforcement

ESLint restricted-import rules and `scripts/architecture_guard.py` verify inward
dependencies, public feature APIs, and the composition exception. Current code
is the file-layout source of truth.
