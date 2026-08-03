# ADR 008 — AppContainer facade split (auth/catalog), composition root as pure DI

**Status:** Accepted; facade-member typing amended 2026-08-03 after Catalog
removed pass-through use-case classes that owned no orchestration.

## Decision

1. **`AppContainer`'s public shape is now two grouped facades**, `auth` and
   `catalog` — not a flat bag of 16 use cases plus the raw `authRepository`,
   `httpClient`, `tagRepository`, `categoryRepository`, and
   `serviceRepository`. Those five concrete adapters are now local variables
   inside `createAppContainer()` and are never returned — presentation has
   no path to reach a repository or the HTTP client directly, by
   construction, not by convention.
2. **Each facade member exposes a structural `execute` shape**, not a concrete
   repository or class. Use `Pick<ConcreteUseCase, 'execute'>` when a real use
   case owns orchestration (Auth), and `{ execute: Repository['method'] }` when
   the facade is intentionally a pure pass-through (Catalog). Both shapes let a
   typed object literal satisfy test fakes without `as unknown as AppContainer`.
3. **`AppProviders` no longer constructs the container.** It takes one as a
   `container` prop and only wires it into `AppContainerContext`. The one
   call to `createAppContainer()` now lives in `main.tsx` - the
   composition root - executed once, outside any component render.

## Rationale

The previous `AppContainer` exposed `authRepository`/`httpClient`/
`tagRepository`/`categoryRepository`/`serviceRepository` as top-level
fields alongside `useCases`. Nothing in the type system stopped a future
hook or component from reaching past a use case straight to a repository
or the HTTP client - the separation existed only because every current
hook happened to only destructure `useCases`. `AppProviders` constructing
the container itself also meant it couldn't be tested (or reused) without
either the real environment variables or a full concrete dependency graph.

Grouping by context (`auth`, `catalog`) rather than one flat facade
matches how the features actually collaborate: Tags/Categories/Services
share the catalog context (docs/MONOREPO.md), while auth is a distinct
concern `TenantBoundary`/`AuthProvider`/`ProtectedRoute` depend on
independently.

## Consequences

- Every hook/component that used to destructure `{ useCases }` now
  destructures `{ auth }` or `{ catalog }` from `useAppContainer()`:
  `AuthProvider`, `CallbackPage`, `useTags`, `useCategories`, `useServices`.
- Every test that built a fake container now uses
  `createFakeAppContainer({ auth: {...}, catalog: {...} })` from
  `src/test/fixtures/createFakeAppContainer.ts` instead of a per-file
  `buildContainer` hand-rolling the full `useCases` shape and casting past
  the type with `as unknown as AppContainer`.
- `main.tsx` now imports `composition/container.ts` directly (it's the
  designated composition root); every other file imports the `AppContainer`
  type only (or nothing from `composition/` at all).
- `container.test.ts` no longer asserts `container.httpClient`/
  `container.authRepository` directly (those fields don't exist on the
  public type) - it verifies wiring behaviorally instead (a catalog call
  with no token still reaches the same `sessionEvents` instance the auth
  facade exposes).
- This ADR does not physically relocate `composition/` under an `app/`
  directory yet - that's part of the larger feature-based reorganization
  (`features/`, `app/`) tracked separately; `main.tsx` already treats
  `composition/container.ts` as the composition root regardless of its
  current file path. (Done — see docs/adr/009; the composition root now
  lives at `app/composition/container.ts`.)
