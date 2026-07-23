# ADR 009 — Feature-based modularization (`features/`, `app/`, `shared/`)

**Status:** Proposed — target structure and migration plan specified below;
physical file move deliberately not executed in this change (see
"Why this is deferred, not done").

## Decision

Replace the current horizontal (layer-first) top-level structure —
`domain/`, `application/`, `infrastructure/`, `presentation/`, each
containing every feature's files side by side — with a vertical,
feature-first structure:

```text
src/
  app/
    bootstrap (main.tsx, App.tsx)
    router.tsx
    providers/        (AppProviders, wiring only)
    composition/       (container.ts - the composition root)

  features/
    auth/
      domain/          (User, Tenant, Session)
      application/     (AuthRepository port, use cases, TenantContext)
      infrastructure/   (OidcAuthRepository, createUserManager, mappers)
      presentation/     (AuthProvider, AuthContext, useAuth, TenantBoundary,
                         LoginPage, CallbackPage, ProtectedRoute)
      index.ts          (public API — what other features/app may import)

    catalog/
      domain/            (Tag, Category, Service entities + their errors)
      application/       (Tag/Category/ServiceRepository ports, 12 use cases)
      infrastructure/     (Api*Repository, mappers)
      presentation/
        tags/            (TagsPage, TagForm)
        categories/      (CategoriesPage, CategoryForm)
        services/        (ServicesPage + its decomposed sub-components,
                           ServiceForm, useServicesController)
      index.ts

  shared/
    domain/              (DomainError - the one base class every entity's
                          error subclasses across every feature extend)
    application/         (AppError, HttpClient port, SessionEventBus port)
    infrastructure/
      http/              (AuthenticatedHttpClient, ApiError, ProblemDetails,
                          mapErrorToAppError, NetworkError, TimeoutError)
    presentation/
      ui/                (shadcn/ui primitives, unchanged)
      components/        (PageHeader, StatusMessage, ErrorBoundary, etc.)
      hooks/             (useAsync, useDebouncedValue, useCreateInline)
      providers/         (ThemeProvider)
```

Each feature exposes a single `index.ts` as its public API; nothing outside
a feature imports past that file into the feature's internal `domain/`,
`application/`, or `infrastructure/`. Tags, Categories, and Services share
one `catalog` feature (not one each) — they collaborate in the same
business context (docs/MONOREPO.md: all three live in `services-service`
on the backend) and cross-reference each other constantly (a Service has a
`categoryId` and `tags`), so splitting them into separate features would
just relocate the existing, correct cross-references into cross-feature
imports the architecture guard would then have to special-case.

## Rationale

The codebase organizes by layer today: `presentation/pages/TagsPage/`,
`presentation/pages/ServicesPage/` sit next to each other, but a change to
"how Tags work end-to-end" touches four different top-level directories
(`domain/entities/Tag.ts`, `application/use-cases/tags/`,
`infrastructure/repositories/ApiTagRepository.ts`,
`presentation/pages/TagsPage/`). That's a reasonable Clean Architecture
layering _within_ a feature, but it stops being reasonable as the
_primary_ organizing axis once the app grows past a handful of verticals
(docs/VISION.md lists five more coming: Appointments, Clients, Inbox,
Dashboard, Settings) - a horizontal split makes "what belongs to Tags"
answerable only by grep, not by directory.

Grouping by feature keeps Clean Architecture's dependency rule
(`domain ← application ← infrastructure/presentation`) intact _inside_
each feature, while making "what belongs to this feature" a directory,
and making a feature's public surface an explicit, enforceable file
(`index.ts`) instead of an implicit convention.

## Why this is deferred, not done

This same change already carried a large, high-risk diff before this ADR:
the single-source-of-truth auth rewrite (docs/adr/006), the AppError
taxonomy and idempotent callback (docs/adr/007), and the AppContainer
facade split (docs/adr/008) touched roughly 45 files, none of them yet
committed. The physical move this ADR describes is pure file relocation —
zero behavior change — but at its real size:

- **`auth`**: ~35 files (4 use cases, `OidcAuthRepository`,
  `createUserManager`, the OIDC session mapper, `User`/`Session`/`Tenant`
  - their errors, `AuthProvider`/`TenantBoundary`/`useAuth`,
    `ProtectedRoute`, `LoginPage`, `CallbackPage`, and every test file
    alongside each).
- **`catalog`**: ~55-60 files (12 use cases, 3 repositories, 3 mappers,
  3 entities, 3 pages, 3 forms, `ServicesPage`'s just-decomposed
  sub-components, every test file alongside each).

Moving either means updating every import path in every file that
references the moved module - by count, on the order of 60-100 edits for
`auth` alone once every _importer_ (not just the moved files themselves)
is included. That volume of mechanical edits, attempted in the same pass
as everything above, has a real chance of leaving the tree in a
half-migrated, non-building state if it doesn't finish clean - a strictly
worse outcome than a fully-specified plan, and exactly what this
project's own guidance warns against ("Faça mudanças incrementais...
Evite uma movimentação massiva de arquivos sem testes intermediários").

This ADR is therefore the checkpoint: the target structure and rationale
are decided and recorded now, so a following change can execute the move
(starting with `auth`, the smaller of the two, then `catalog`) as its own
focused diff, verifying the full gate suite after each, without competing
for review attention against unrelated behavioral changes.

## Migration runbook (for the follow-up change)

1. **Move `auth` first.** `git mv` each file into its new path under
   `features/auth/{domain,application,infrastructure,presentation}/`
   (see the file list above). Update every import in the moved files
   themselves, then grep the rest of `src/` for the old paths
   (`from '.*domain/entities/User'`, `.*infrastructure/auth/`,
   `.*application/use-cases/auth/`, `.*domain/value-objects/Tenant'`,
   `.*application/repositories/AuthRepository'`,
   `.*application/context/TenantContext'`, etc.) and fix every importer.
   Add `features/auth/index.ts` re-exporting the public surface
   (`useAuth`, `AuthProvider`, `TenantBoundary`, `ProtectedRoute`,
   `LoginPage`, `CallbackPage`, `TenantContext`, plus whatever
   `composition/container.ts` needs to wire the feature's use cases).
   Run the full gate suite (build/lint/test/coverage/governance) before
   moving on.
2. **Move `catalog` second**, same method, larger surface.
3. **Extract `shared/`** for the technical, cross-feature pieces listed
   above (`DomainError`, `AppError`, `HttpClient`/`SessionEventBus`,
   `AuthenticatedHttpClient` and its error types, `useAsync`,
   `useDebouncedValue`, `useCreateInline`, shadcn/ui, `ThemeProvider`,
   `ErrorBoundary`/`ErrorScreen`/`isChunkLoadError`,
   `RouteErrorElement`/`PageHeader`/`StatusMessage`).
4. **Move `app/`** (`main.tsx`, `App.tsx`, `router.tsx`,
   `AppProviders`, `composition/container.ts`) - this is where
   `createAppContainer()` is called (docs/adr/008); nothing else may
   import `composition/` directly afterward.
5. **Add the enforcement rule**: `presentation`/`application`/
   `infrastructure` inside a feature must not be reached from outside
   that feature except via its `index.ts` - add this to both
   `eslint.config.js` (a `no-restricted-imports` block per feature,
   mirroring the existing `domain/`/`application/` blocks) and
   `scripts/architecture_guard.py` (a new check alongside
   `check_cross_page_imports`). Update
   `agent-skills/agenza-frontend-feature` and
   `apps/admin-frontend/AGENTS.md` to teach the new structure - the
   current versions still describe and enforce the horizontal layout.
6. Update `docs/STATUS.md` and this ADR's `Status` line to `Accepted`
   once every step above is done and green.
