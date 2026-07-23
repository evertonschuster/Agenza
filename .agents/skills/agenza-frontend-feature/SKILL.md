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

    catalog/           Tags, Categories, Services - one feature, they
                        collaborate in the same business context
      domain/          Tag, Category, Service entities + their errors
      application/     3 repository ports, 12 use cases
      infrastructure/  Api*Repository, mappers, generated/ (OpenAPI types)
      presentation/
        tags/          TagsPage, useTagsPage, TagsTable, TagEditorDialog, TagDeleteDialog
        categories/    same shape as tags/
        services/      ServicesPage + its decomposed sub-components (see
                        "Componentization" below)
        forms/         TagForm, CategoryForm, fieldMaps (shared inside catalog)
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
   one.** A resource that collaborates closely with Tags/Categories/
   Services (shares forms, cross-references, or the same backend service)
   belongs in `features/catalog/`; a genuinely independent domain gets its
   own `features/<name>/` following the same four-layer shape.
4. **Identify which use cases the current page actually needs.** Don't
   build every possible use case upfront.

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
and throws a named error subclassing `shared/domain/DomainError.ts` — see
`Category.ts`/`Service.ts` (`features/catalog/domain/entities/`) for the
existing pattern (`InvalidCategoryError`/`InvalidServiceError`). This is
the frontend's own, already-established exception-and-catch convention
for validation failures, distinct from the .NET backend's Result/
DomainResult pattern (docs/adr/0014, `backend/AGENTS.md`) — that ADR
governs the backend only; every caller here already expects a throw
(`useAsync`'s `catch`, `mapApiErrorToForm`). No constructor parameter
property shorthand (`erasableSyntaxOnly`) — explicit field declarations +
assignment in the constructor body. Optional fields: `if (value !==
undefined) { this.field = value }`, never a direct assignment of a
possibly-`undefined` value (`exactOptionalPropertyTypes`). `strict: true`
— never `any`; if a value's shape is genuinely unknown at a boundary,
type it `unknown` and narrow it, never widen with `any`.

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
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
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
(`import type { TagDto } from '@/features/catalog/infrastructure/
mappers/tagMapper'`) is the one place allowed to import a feature's
internals directly from outside it — `src/test/**` is exempt from the
public-API-only rule (ESLint + `architecture_guard.py` both carve this
out explicitly).

### 7. Presentation hook (TDD) — build on `useAsync`, not a new pattern

`shared/presentation/hooks/useAsync.ts` is the one shared "call an async
function, track loading/data/error" primitive — every feature hook
(`useCategories`, `useServices`, `useTags` — and `AuthProvider` for the
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

For a mutation (`createTag`, `updateTag`, `deleteTag` in `useTags.ts`),
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

Replace the stub. **`TagsPage` is the reference for behavior and design**
(search → table → dialog create/edit → `AlertDialog` delete-confirm,
loading/error/empty states) — **not for anatomy**. Copy the *pattern*, not
the file count: a feature with more independent workflows legitimately
needs more files than Tags does. See "Componentization" below for when
and how to split a page's controller hook, form, and dialog.

#### List = `Table`, form = `Dialog` — always

A page listing records renders a `Table` (`src/components/ui/table.tsx`):
one row per record, actions (Edit/Delete) as buttons in the last column —
not stacked `Card`s. A create/edit form always opens in a `Dialog`
(`src/components/ui/dialog.tsx`) over the list — never inline in the page,
never its own route. One `Dialog` instance whose content switches between
create/edit based on which record (if any) triggered it (`TagsPage`'s
dialog-target state), not a dialog per row. The form component itself stays
dialog-agnostic — the page (or its dialog wrapper) wires it into the
`Dialog`.

A destructive action (delete) is confirmed with the shared
`DeleteConfirmationDialog` (`shared/presentation/components/`, built on
`AlertDialog`) — never `window.confirm`, and never a hand-rolled
`AlertDialog` per feature once `DeleteConfirmationDialog` already covers
the shape. Pair it with the shared `useDeleteConfirmation`
(`shared/presentation/hooks/`) for the target/progress/error state
machine behind it.

#### Componentization — page shell, controller hook, promotion rule

- A page component (`XPage.tsx`) is a **composition shell**: it renders
  presentational components wired to a controller hook's view models, and
  nothing else — no `useState`, no business logic, no direct repository/
  use-case calls.
- A controller hook (`useXPage`) follows the same single-responsibility
  bar as any other code: when it accumulates more than one real workflow
  (search/filter state, an editor with dirty-tracking, a deletion
  confirmation are three *different* concerns), split it into focused
  hooks (`useXFilters`, `useXEditor`, `useXDeletion`) that the page's
  composer hook assembles — see `features/catalog/presentation/services/`
  for the reference (`useServicesPage` composing `useServiceFilters` +
  `useServiceEditor` + `useServiceDeletion`).
- Extract a component or hook on its **first** use if it's already a
  distinct concern (a field group, a delete dialog) — keep it
  feature-local (e.g. `features/catalog/presentation/services/
  ServiceCategoryField.tsx`). Only **promote** something to `shared/`
  once a **second**, genuinely-identical use appears across features —
  the "second use" rule gates promotion, not the initial extraction.
- Break a type cycle between a controller and the component(s) it feeds
  by putting the shared shape in a neutral, feature-local module (e.g.
  `servicePresentationModels.ts`) that both sides import — the controller
  must never import a component's Props type, and a component must never
  import the controller's internal types.
- A dialog or form with a large, flat prop list is a signal to group
  related props into a cohesive, named model (`editor`, `categoryOptions`,
  `discardConfirmation`) instead of one generic catch-all object that
  just hides the count.
- Decomposition triggers: multiple independent workflows, several
  dialogs, distinct state clusters, an unmanageable prop list, a
  controller/component type cycle, or a page test file too large to
  navigate. There is no hard line-count cap.
- `GenericCrudPage` (or any config-driven, entity-agnostic CRUD
  abstraction) is prohibited — share only behavior proven identical
  across features (see the shared hooks/components list above), never a
  generic page shape.

#### Forms: React Hook Form + Zod

Any form beyond a single trivial field uses `react-hook-form` +
`@hookform/resolvers/zod` — see `TagForm.tsx`
(`features/catalog/presentation/forms/`) for the exact shape:

```typescript
const tagFormSchema = z.object({
  name: z.string().trim().min(1, NAME_MESSAGE).max(40, NAME_MESSAGE),
  color: z.enum(TAG_COLOR_PALETTE, { message: COLOR_MESSAGE }),
})
export type TagFormValues = z.infer<typeof tagFormSchema>

const { register, control, handleSubmit, setError, setFocus, formState: { errors } } =
  useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
```

- `<form onSubmit={e => void handleSubmit(onSubmit)(e)} noValidate ...>` —
  `noValidate` because native browser constraint validation would
  intercept submit before react-hook-form/zod ever sees it.
- **A form with several field groups (name/description, duration range,
  price/discount, category, tags — see `ServiceForm`) splits into one
  component per group, sharing the RHF instance via `FormProvider`/
  `useFormContext`** instead of prop-drilling `register`/`control`/
  `errors` into each. The orchestrator component still owns
  `useForm`/`handleSubmit`/the server-error effect; each field-group
  component calls `useFormContext<FormInput, unknown, FormValues>()` for
  its own slice.
- **Structured API errors, mapped to fields — never parsed from free
  text.** `shared/presentation/forms/serverFormError.ts`'s
  `mapApiErrorToForm(error, fieldMap, codeFieldMap, fallbackMessage)`
  differentiates a 400 validation `AppError` (has `rawFieldErrors` — map
  each backend field name to the form's field via `fieldMap`) from a
  409/404/403 `AppError` (has `backendCode` — map via `codeFieldMap` when
  the code names a specific field, e.g. a duplicate-name conflict
  highlighting the name field, otherwise it becomes a global message). It
  only ever depends on `AppError` (application-layer) — `ApiError`/
  `ProblemDetails` (infrastructure) never cross into a form. Apply the
  result with `setError(field, { type: 'server', message })` in a
  `useEffect` keyed on the server-error object, and
  `setFocus(firstField)` so a screen-reader/keyboard user lands on the
  first invalid field instead of losing their position — see `TagForm`'s
  `serverError` effect.
- Don't reach for Formik or Yup without an explicit ADR — React Hook Form
  + Zod is the established, working pattern here (`docs/DECISIONS.md`).

#### Inline creation (a select that can create its own options)

`shared/presentation/hooks/useCreateInline.ts` is the shared
`isCreating`/`serverError`/`create`/`reset` state machine behind any
"create a related record without leaving this form" flow
(`CreatableSingleSelect`/`CreatableMultiSelect`). It keeps the outer
form's already-typed values untouched and keeps the popover open to show
an error, instead of every entity reinventing this. Reuse it — don't
hand-roll a second inline-create state machine, and don't let an inline
create's error/loading state leak into or reset the outer form.

#### Build from existing components — don't hand-roll markup, don't extend speculatively

shadcn/ui primitives live in `src/components/ui/` and are already themed.
If a page needs something not there (select, badge, etc.), add it with
`npx shadcn@<version> add <component> -c apps/admin-frontend` from the
repo root — use the version already pinned in
`apps/admin-frontend/package.json`'s `devDependencies.shadcn`, not
`@latest` (which would bypass that pin and could fetch an update the
repo hasn't reviewed). Then check the result compiles under
`exactOptionalPropertyTypes: true` (some generated files need fixing —
see `dropdown-menu.tsx`'s removal for when to give up and remove instead
of patch).

Use generated files as the CLI writes them. Don't add a prop, variant, or
custom styling to a `src/components/ui/*` file unless a page genuinely
needs it right now — no speculative extensions "in case a future page
wants it." Do it at the call site instead (a conditional `<Spinner />` in
`children`, a `className` override on an existing `variant`).

Shared composites live in `shared/presentation/components/` — reuse
before writing a new one:

| Component                        | Use for                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| `PageHeader`                     | Title + primary action row at the top of every page             |
| `StatusMessage`                  | Loading / empty / error text (`tone="error"` for errors)        |
| `CollectionFeedback`             | Loading/error/empty/last-known-good states for a tenant-scoped list |
| `DeleteConfirmationDialog`       | Destructive-action `AlertDialog`, wired to `useDeleteConfirmation` |
| `TextField` / `TextAreaField`    | Labeled form inputs (wraps shadcn `Label` + `Input`/`Textarea`) |
| `CenteredScreen`                 | Full-page centered content (pre-auth screens only)              |
| `FullScreenSpinner`              | Full-page loading state                                         |
| `ThemeToggle`                    | Already in `AdminLayout` — don't add another one                |

Only promote a one-off to `shared/` once a second, genuinely identical
use appears (see "Componentization" above) — until then it stays
feature-local.

#### Use semantic tokens — never raw palette classes

`src/index.css` defines the whole palette as CSS variables, redefined
under `.dark` — `bg-background`/`text-foreground` etc. resolve correctly
in both themes automatically. A raw class like `bg-slate-50` does not —
it's a fixed light-mode color that breaks the moment a user switches to
dark.

| Instead of (stale, don't use)       | Use                           | For                           |
| -------------------------------------- | -------------------------------- | -------------------------------- |
| `bg-slate-50`                        | `bg-background`               | Page background               |
| `bg-white`                           | `bg-card`                     | Card/surface background       |
| `border-slate-200`                   | `border-border`               | Card and divider borders      |
| `text-slate-800`                     | `text-foreground`             | Headings, primary text        |
| `text-slate-600` / `text-slate-400` | `text-muted-foreground`       | Secondary/muted text          |
| `text-red-600`                       | `text-destructive`            | Error text                    |
| `bg-teal-600` / `text-teal-700`     | `text-primary` / `bg-primary` | Brand accent, primary buttons |

There is no brand color to special-case — the app uses the stock
shadcn/ui neutral theme. If in doubt, use a token.

#### Icons and accessibility

`lucide-react`, matched to the icon already used for this section in
`AdminLayout`'s nav. Always add `aria-hidden="true"` on a decorative icon.
Every interactive element needs a real accessible name (visible label,
`aria-label`, or `sr-only` text) and must be reachable and operable by
keyboard alone — tab order, `Enter`/`Space` activation, `Escape` closing a
`Dialog`/`AlertDialog`/popover (Radix primitives give you this for free;
don't fight it with a custom `onKeyDown` unless a page genuinely needs
one). Check color contrast against both themes when introducing any new
non-token color.

#### Mobile responsiveness — every page must work at 375px wide

- `Table` already scrolls horizontally on its own
  (`data-slot="table-container"` wraps it in `overflow-x-auto`) — don't
  add a second scroll wrapper.
- `Dialog` is responsive by default (`max-w-[calc(100%-2rem)]` below its
  `sm:` breakpoint).
- Any `flex` row inside a form that could get tight still needs
  `flex-wrap` — see `TagForm`'s color swatches and button row.
- Never use a fixed pixel width wider than ~300px without a responsive
  override. Prefer `w-full` + `max-w-*`.
- `AdminLayout` already handles the page shell (off-canvas sidebar below
  `md`) — pages don't need their own mobile nav handling.

#### States

Handle all three `useAsync` states: loading → `StatusMessage`, error →
`StatusMessage tone="error"`, success → real UI (or `CollectionFeedback`
for a tenant-scoped list, which also covers the empty and
last-known-good-after-a-failed-refresh states).

#### Language — all user-facing text is Brazilian Portuguese (pt-BR)

Every string a user reads or a screen reader announces — headings, button
labels, `PageHeader`/`StatusMessage` text, form labels/hints,
`aria-label`s, confirm prompts, error-message fallbacks — is pt-BR. See
`TagsPage`/`TagForm` for the pattern (e.g. "Nova etiqueta", `aria-label="Cor
${paletteColor}"`). Code stays in English: identifiers, comments, commit
messages, this skill's own prose.

Nav labels (source of truth: `AdminLayout.tsx`'s `NAV_ITEMS`) are Painel,
Agendamentos, Serviços, Clientes, Caixa de entrada, Etiquetas,
Configurações — reuse the exact same word for a stub page's
`PlaceholderPage title` and for that vertical's `PageHeader title` once
built.

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
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
}
```

`AuthenticatedHttpClient` (`shared/infrastructure/http/`): constructor
takes `getRequestSession: GetRequestSession` (returns both the access
token and tenant id from one session read — `shared/application/
RequestSession.ts`), prepends `VITE_API_BASE_URL`, attaches `Authorization:
Bearer <token>` and `X-Tenant-Id`, converts every failure (missing
session, 401, non-2xx `ProblemDetails`, network/timeout) into an
`AppError` (`shared/application/AppError.ts`) before it leaves
infrastructure — never `ApiError`/`ProblemDetails` directly (docs/adr/007).
Wired into `createAppContainer()` (`app/composition/container.ts`) using
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
- [ ] List uses `Table`, form opens in a `Dialog` — not stacked `Card`s
      or an inline/routed form
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
