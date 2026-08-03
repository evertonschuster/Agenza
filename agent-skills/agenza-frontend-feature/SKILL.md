---
name: agenza-frontend-feature
description: >
  Use whenever building or changing a feature in apps/admin-frontend —
  React components, pages, hooks, forms, Zod schemas, use cases, or HTTP
  calls. Trigger on "let's build [feature]", "implement [feature]", "add a
  page/form/hook", or when the user provides an API spec for a resource.
  Covers this project's feature-based Clean Architecture layering (ADR 009:
  app/, features/{auth,catalog}/, shared/), React Hook Form + Zod forms,
  structured server-error-to-field mapping, out-of-order-response and
  inline-creation state handling, shadcn/ui usage, accessibility, dark
  mode, mobile, comment policy, and pt-BR text rules. Do NOT proceed
  without reading it — several conventions here differ from generic React
  tutorials and from older, now-superseded guidance for this same project.
---

# Frontend Feature

## Physical layout (ADR 009)

```text
src/
  app/                bootstrap, routing, DI wiring
    main.tsx          composition root: the only createAppContainer() call
    App.tsx
    routes/           router.tsx, RouteErrorElement
    providers/        AppProviders, AppContainerContext, useAppContainer
    composition/      container.ts - the only place allowed to construct
                       concrete repository/auth implementations
    layouts/          AdminLayout
    pages/            stub pages not yet promoted to their own feature

  features/
    auth/
      domain/          User, Tenant, Session, their errors
      application/     AuthRepository port, 4 use cases, TenantContext
      infrastructure/  OidcAuthRepository, createUserManager, oidc mapper
      presentation/    AuthProvider, useAuth, TenantBoundary, ProtectedRoute,
                        LoginPage, CallbackPage
      index.ts         public API - everything outside this feature imports
                        through here, never a deep path into the above

    catalog/           Categories, Services - one feature, they
                        collaborate in the same business context. Tags
                        was removed from the frontend (docs/adr/016 in
                        this app's ADRs) - the backend Tag domain/API
                        is intentionally retained, unrelated to this
                        feature's current frontend shape
      domain/          Category, Service entities + their errors
      application/     3 repository ports, 12 use cases
      infrastructure/  Api*Repository, mappers, generated/ (OpenAPI types)
      presentation/    every entity folder (categories/, services/)
                        shares the same internal shape - location alone
                        tells you a file's role:
        <entity>/
          <Entity>Page.tsx   composition shell (stays at entity root by
                             default; Categories uses pages/, ADR 012)
          hooks/             data hook (useCategories/useServices)
                             + controller hook (useXPage) + any sub-hooks
                             (useServiceEditor, useServiceDeletion, ...)
          components/        presentational pieces: tables, dialogs,
                             field-groups
          forms/             the entity's create/edit form + its zod
                             schema + its own fieldMaps.ts (never shared
                             across entities - see "Forms" below)
          models/            services/ only - pure, non-React view-model/
                             formatting logic (servicePresentationModels,
                             serviceFormatters); categories has no
                             equivalent, so no models/ for it
      index.ts         public API

  shared/
    domain/            DomainError - the base class every entity error extends
    application/       AppError, HttpClient port, SessionEventBus port,
                        RequestSession (atomic per-request session snapshot)
    infrastructure/
      http/            AuthenticatedHttpClient, ApiError, ProblemDetails,
                        mapErrorToAppError, NetworkError, TimeoutError
      InMemorySessionEventBus.ts
    presentation/
      components/      PageHeader, StatusMessage, ErrorBoundary,
                        CollectionFeedback, DeleteConfirmationDialog, etc.
      hooks/            useAsync, useDebouncedValue, useCreateInline,
                        useDialogTarget, useDeleteConfirmation
      forms/            serverFormError.ts (mapApiErrorToForm)
      providers/        ThemeProvider

  components/ui/        shadcn/ui primitives - stay at this top-level path,
  lib/utils.ts           NOT moved into shared/ (see below)
```

**`src/components/ui/**` and `src/lib/utils.ts` are exceptions to the
feature layout** — shadcn's CLI generates every `components/ui/*.tsx` file
importing `@/lib/utils` by a fixed convention; moving either would mean
hand-editing generated files just to accommodate the reorganization, which
this project's own rules prohibit (see "Build from existing components"
below). They stay exactly where `npx shadcn add` puts them.

A feature vertical is a full slice inside its feature's four layers:

```text
features/<feature>/domain/          → plain TS class, no framework deps
features/<feature>/application/     → repository interface (port) + use cases
features/<feature>/infrastructure/  → implements the port via HttpClient
features/<feature>/presentation/    → hooks built on useAsync, forms, pages
```

For translating an external API spec into the DTO/mapper/MSW-handler seam,
use `apps/admin-frontend/.skills/admin-api-contract/SKILL.md` alongside
this skill. For TypeScript-strict-mode test gotchas and mock-strategy-per-
layer rules, use `apps/admin-frontend/.skills/admin-tdd-conventions/SKILL.md`.
This skill governs everything between those two: architecture, forms,
state, UI, and completion criteria.

---

## Pre-conditions before writing any code

1. **Get the API spec** from the user before touching infrastructure.
   Ask for: endpoint paths, HTTP methods, request shape, response shape,
   error codes/shapes. Never invent field names — this is one of the
   question-policy triggers in the root `AGENTS.md` (changes a contract).
2. **Check whether `HttpClient` exists** at
   `src/shared/application/HttpClient.ts` (implemented by
   `AuthenticatedHttpClient` in `src/shared/infrastructure/http/`). Every
   REST repository depends on it; it already exists for every current
   feature.
3. **Decide whether this is a new feature or belongs in an existing
   one.** A resource that collaborates closely with Categories/Services
   (shares forms, cross-references, or the same backend service) belongs
   in `features/catalog/`; a genuinely independent domain gets its own
   `features/<name>/` following the same four-layer shape.
4. **Identify which use cases the current page actually needs.** Don't
   build every possible use case upfront.

For authentication work, preserve the repo's fail-closed flow:

- `/login` automatically starts the OIDC redirect once authentication state
  is known; it is an informative transition/recovery screen, not a second
  “Entrar” confirmation. Pass the current `light` or `dark` theme through
  the OIDC authorization request so the identity credential page can apply
  it before rendering.
- Map provider failures inside auth infrastructure to `AuthFlowError`.
  Presentation shows a stable support code, a specific curated pt-BR
  explanation, the next recovery action, and tells the user what context to
  send when requesting help without exposing raw technical details or asking
  them to share a password. A generic “contacte o administrador” fallback is
  not sufficient for an authentication failure.
- A silent renewal may update tokens and expiry only. If `user.id` or
  `tenant.id` differs from the cached session, clear the OIDC user and require
  a full login before any request can use the new identity.

---

## Comments — minimum of the minimum, by default zero

Default to no comment. Identifiers, types, and structure carry the
meaning — a comment restating what a well-named function/prop/hook
already says is waste. Add a one-line comment (never a paragraph, never a
JSDoc block on a clearly named interface/hook/prop/entity) only when a
careful senior reviewer would still get it wrong without it: a security/
tenant-isolation default, a concurrency/race guard, a genuine React/
Radix/RHF/Zod/browser quirk, or an unavoidable lint suppression.
Architectural rationale belongs in `docs/adr/` — reference it in one
short clause at most (`see docs/adr/0006`), never restate it. If a
mechanism needs a paragraph to explain, simplify the mechanism/names/
types first rather than documenting the complexity. This is the same bar
as `apps/admin-frontend/AGENTS.md` and `backend/AGENTS.md`.

---

## Step-by-step build order

### 1. Domain entity (TDD)

`features/<feature>/domain/entities/EntityName.ts` — zero imports from
React, that feature's own `application/`, `infrastructure/`, or
`presentation/`, and zero imports from another feature. Private
constructor + static `create(input)` factory that validates invariants
and returns `Result<EntityName, InvalidEntityNameError>`
(`shared/application/Result.ts`) instead of throwing (docs/adr/014,
docs/adr/015 — both Catalog's `Category.ts` and Auth's
`Session.ts`/`User.ts`/`Tenant.ts` follow this). Every caller composes
with `flatMapResult`/`combineResults`, or plain early-return `Result`
branching for a short sequential chain with heterogeneous error types
(see `mapOidcUserToSession`, `features/auth/infrastructure/`) — never
`try/catch`. A mapper that turns a domain validation failure arising from
an untrusted API response into a curated `AppError` uses
`shared/infrastructure/http/malformedResponseError.ts`, not its own
message. `useAsync` (`shared/presentation/hooks/useAsync.ts`) takes
`() => Promise<Result<T, E>>`, not a throwing `() => Promise<T>`.

A test fixture that needs a known-valid entity (most test files touching
auth or catalog do) imports `Tenant`/`User`/`Session`/`Category`
from `src/test/fixtures/{authEntityFixtures,unwrapResult}.ts` instead of
the real `domain/entities/` path — those re-export the same `create()`
call shape already unwrapped, so call sites read exactly like before
without every test wrapping every call in `unwrapResult(...)`. Only each
entity's own `*.test.ts` imports the real class directly, since it
specifically asserts on both the success and failure `Result` shapes.

Every feature vertical (Catalog now, Auth now, a future one like
Services) follows this same Result convention — there is no throwing
variant left to mirror.

No constructor parameter property shorthand (`erasableSyntaxOnly`) —
explicit field declarations + assignment in the constructor body. Optional
fields: `if (value !== undefined) { this.field = value }`, never a direct
assignment of a possibly-`undefined` value (`exactOptionalPropertyTypes`).
`strict: true` — never `any`; if a value's shape is genuinely unknown at a
boundary, type it `unknown` and narrow it, never widen with `any`.

### 2. Repository interface (no test needed)

`features/<feature>/application/repositories/FeatureRepository.ts` —
interface only. Every method takes `tenantContext: TenantContext`
(imported from `@/features/auth`, never from its internal path) as its
first parameter. Returns domain entities, never raw DTOs. `Promise<T |
null>` for nullable results.

### 3. Use cases (TDD)

`features/<feature>/application/use-cases/FeatureName/UseCaseName.ts` —
one class per use case, explicit constructor body (no shorthand):

```typescript
export class ListServices {
  private readonly serviceRepository: ServiceRepository;

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository;
  }
}
```

Test with hand-written fake repositories (`.skills/admin-tdd-conventions`).
Add a shared fake to
`features/<feature>/application/test-helpers/createFakeFeatureRepository.ts`
after the second use case needs it.

### 4. Wire into the container

Add to `AppContainer`'s facade interface and `createAppContainer()` in
`app/composition/container.ts` — the **only** place allowed to construct
concrete repository implementations. Import the concrete classes from the
feature's `index.ts` (`@/features/<feature>`), not a deep path — see
docs/adr/009's "Execution" section for why `index.ts` re-exports
composition-only wiring alongside the genuinely public surface.

### 5. Infrastructure mapper (TDD)

`features/<feature>/infrastructure/mappers/featureMapper.ts` — pure
function `mapApiDtoToDomainEntity(dto: FeatureDto): Feature`. Test every
field mapping and every validation failure path.

### 6. Infrastructure repository (TDD with MSW)

`features/<feature>/infrastructure/repositories/ApiFeatureRepository.ts`
— implements the port, takes `HttpClient` in its constructor (explicit
field pattern). Tests use MSW handlers in
`src/test/mocks/handlers/featureHandlers.ts`, registered in
`src/test/mocks/handlers/index.ts`. `onUnhandledRequest: 'error'` is
global — any call without a registered handler fails loudly. A test mock
handler typing a fixture against a feature's internal DTO type
(`import type { CategoryDto } from '@/features/catalog/infrastructure/
mappers/categoryMapper'`) is the one place allowed to import a feature's
internals directly from outside it — `src/test/**` is exempt from the
public-API-only rule (ESLint + `architecture_guard.py` both carve this
out explicitly).

### 7. Presentation hook (TDD) — build on `useAsync`, not a new pattern

`shared/presentation/hooks/useAsync.ts` is the one shared "call an async
function, track loading/data/error" primitive — every feature hook
(`useCategories`, `useServices` — and `AuthProvider` for the
shared session) builds on it instead of a bespoke `useState`/`useEffect`
pair or a server-state library (see "Prohibited" below). It already
handles the two things that are easy to get wrong by hand:

- **Out-of-order responses**: if a second `execute()` fires before the
  first resolves (a fast filter change, page change, or tenant switch),
  only the most recently started call's result is ever applied — pass
  `resetKey` (e.g. the tenant id) so a genuine context switch clears
  `data`/`error` synchronously instead of flashing stale data.
- **Unmounted-component writes**: guarded internally; you don't need your
  own `isMounted` ref.

For a mutation (create/update/delete on a feature's data hook),
**a create's success must not depend on the follow-up refetch succeeding**:
call `mutate(current => [...(current ?? []), created])` to insert the new
item into the hook's state immediately after the write succeeds, then
`void execute()` in the background to reconcile with the server. If that
background refetch fails, the optimistically-inserted item is still on
screen; surface the refetch's own `status`/`error` separately rather than
rolling back a successful create because of it. `update`/`delete` can
simply `await execute()` since there's no optimistic value to insert.

Get `tenantContext` from `useAuth()` (`@/features/auth`) inside a
`ProtectedRoute` — treat it as possibly `null` in a hook (the page can
mount while `useAuth()` is still resolving), guard each method, and pass
the tenant id as `useAsync`'s `resetKey` so a tenant switch clears data
instead of leaking the previous tenant's rows onto screen even for one
frame (multi-tenancy — see root `AGENTS.md`).

### 8. Page component

Replace the stub, following `CategoriesListPage`/`CategoryEditorDialog`
(`features/catalog/presentation/categories/`) as the reference for
behavior and design (search → table → dialog create/edit →
`AlertDialog` delete-confirm, loading/error/empty states) — not for
anatomy. Copy the _pattern_, not the file count: a feature with more
independent workflows legitimately needs more files than Categories does.

Read [references/page-ui-conventions.md](references/page-ui-conventions.md)
before writing any page, form, or UI component — it covers the
List=Table/form=Dialog convention, componentization and the
controller-hook promotion rule, React Hook Form + Zod, inline creation,
building from shadcn/ui without speculative extensions, semantic color
tokens, icons/accessibility, mobile responsiveness at 375px, the three
`useAsync` states, and the pt-BR language rule.

---

## Prohibited

- A second, competing design system or component library alongside
  shadcn/ui + Radix + Tailwind — extend the existing one (see "Build from
  existing components" above).
- Formik or Yup without an explicit ADR — this project already made this
  decision (React Hook Form + Zod).
- Redux, Zustand, or any global client-state store used as a server-data
  cache — `useAsync` + the container's use cases are the established
  pattern; a genuinely local UI-only state (a dialog's open/closed flag)
  is fine as plain `useState`, but server data always flows through a
  hook built on `useAsync`.
- Hand-duplicating a contract the codebase already generates —
  `features/catalog/infrastructure/generated/services-api.d.ts` is
  generated from the backend's OpenAPI document
  (`npm run generate:api-types`); don't hand-write a parallel DTO type
  for something already generated, and don't let a hand-written one
  silently drift from it (see `agent-skills/agenza-api-contract-review`).
- Importing a feature's internal `domain/`, `application/`,
  `infrastructure/`, or `presentation/` module from outside that feature
  — share through its `index.ts` public API instead (ADR 009). This is
  ESLint- and `architecture_guard.py`-enforced.
- `GenericCrudPage`, or any generic entity-agnostic CRUD abstraction.
- `any`, anywhere, including test files and fakes.

---

## HttpClient (already built — read before touching infrastructure)

```typescript
// shared/application/HttpClient.ts
export type Decoder<T> = (payload: unknown) => T;

export interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<T>;
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>;
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>;
  delete(path: string): Promise<void>;
}
```

Every `get`/`post`/`put` call takes a `decode` function alongside its `T` -
a generic type parameter alone validates nothing at runtime, so the
decoder is what actually stands between an untrusted response body and a
value the rest of the app treats as `T` (docs/adr/011). A feature's mapper
owns its own decoder next to its DTO type (e.g. `categoryMapper.ts`'s
`decodeCategoryDto`/`decodeCategoryDtoArray`) - hand-rolled `typeof`/`Array.isArray`
guards matching `shared/infrastructure/http/ProblemDetails.ts`'s existing
style, not a schema library. A decoder that throws is caught by the same
place every other infrastructure failure already is (see below) - never
add a second try/catch in the repository for this.

`AuthenticatedHttpClient` (`shared/infrastructure/http/`): constructor
takes `getRequestSession: GetRequestSession` (returns both the access
token and tenant id from one session read — `shared/application/
RequestSession.ts`), prepends `VITE_API_BASE_URL`, attaches `Authorization:
Bearer <token>` and `X-Tenant-Id`, converts every failure (missing
session, 401, non-2xx `ProblemDetails`, network/timeout, or a `decode`
rejection) into an `AppError` (`shared/application/AppError.ts`) before it
leaves infrastructure — never `ApiError`/`ProblemDetails`/a raw decode
error directly (docs/adr/007, docs/adr/011). Wired into
`createAppContainer()` (`app/composition/container.ts`) using
`authRepository.getCurrentSession()` to supply both values from the same
read.

---

## Commit checklist

- [ ] Domain entity: explicit field declarations, named errors, no framework deps, no `any`
- [ ] Repository interface: `TenantContext` first param on all methods
- [ ] Use cases: explicit constructor body (no shorthand), tested with fakes
- [ ] Container: wired in interface and factory, imported from the feature's `index.ts`
- [ ] Mapper: tested, all fields and failure paths covered
- [ ] Infrastructure repo: tested with MSW, handler registered
- [ ] Hook: built on `useAsync`, tenant-scoped via `resetKey`, mutations
      use `mutate` for optimistic success decoupled from refetch failure
- [ ] Form (if any): React Hook Form + Zod, server errors mapped to
      fields via `mapApiErrorToForm`, `setFocus` on the first error
- [ ] Page: a composition shell handing view models to presentational
      components; controller hook split by workflow once it has more
      than one
- [ ] Page: handles loading/error/success, built from shadcn/ui primitives
      and shared composites (not hand-rolled markup)
- [ ] List uses `Table`; form uses the feature's documented interaction
      (`Dialog` by default, routed editor only where an ADR establishes it)
- [ ] Destructive actions confirmed with `DeleteConfirmationDialog` — not
      `window.confirm` or a hand-rolled `AlertDialog`
- [ ] No prop/variant added to a `src/components/ui/*` file unless this
      page genuinely needs it right now
- [ ] Page: uses semantic tokens only — no raw `slate-*`/`teal-*`/etc.
- [ ] Page: checked in dark mode and at 375px wide, no horizontal overflow
- [ ] Page: keyboard-operable, decorative icons `aria-hidden`, every
      interactive element has an accessible name
- [ ] All user-facing text (labels, messages, `aria-label`s, confirm
      prompts) is in pt-BR
- [ ] No import of another feature's internals bypassing its `index.ts`,
      no hand-duplicated generated contract, no new global client-state store
- [ ] Comments are at the "minimum of the minimum" bar — none by default
- [ ] `npm run build` clean (catches TypeScript strict mode issues)
- [ ] `npm run lint` clean
- [ ] `npm run test` all green — behavioral assertions, not implementation details
