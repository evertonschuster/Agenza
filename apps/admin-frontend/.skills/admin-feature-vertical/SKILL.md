---
name: admin-feature-vertical
description: >
  Use this skill whenever building a new feature vertical in the admin
  panel project (Services, Appointments, Clients, Inbox, Dashboard,
  Settings). A "feature vertical" means a full slice from domain entity
  through use cases, infrastructure repository, presentation hook, and
  page component. Trigger this skill any time the user says "let's build
  [feature]", "implement [feature]", "next feature", or provides an API
  spec for a resource. Do NOT proceed without reading this skill first —
  it encodes project-specific conventions that differ from generic Clean
  Architecture tutorials.
---

# Admin Feature Vertical

A feature vertical in this project is a full slice:

```
domain/entities/          → plain TS class, no framework deps
application/repositories/ → interface (port)
application/use-cases/    → one class per use case, constructor-injected repo
infrastructure/repositories/ → implements the port via HttpClient
infrastructure/mappers/   → DTO → domain entity mapping function
presentation/hooks/       → useFeature built on useAsync
presentation/pages/       → replaces the stub page
```

---

## Pre-conditions before writing any code

1. **Get the API spec** from the user before touching infrastructure.
   Ask for: endpoint paths, HTTP methods, request shape, response shape,
   error codes. Never invent field names.

2. **Check whether HttpClient exists** at
   `src/infrastructure/http/HttpClient.ts`. If not, build it first
   (see the HttpClient section below) — every REST repository depends on it.

3. **Identify which use cases are needed** for the first version of this
   page. Don't build every possible use case upfront — only what the
   current page actually renders.

---

## Step-by-step build order

### 1. Domain entity (TDD)

Location: `src/domain/entities/FeatureName.ts`

Rules:

- Zero imports from React, application/, infrastructure/, or presentation/
- Private constructor + static `create(input)` factory
- Validates invariants in `create()` and throws a named `DomainError` subclass
- NO constructor parameter property shorthand — `erasableSyntaxOnly` forbids it.
  Always use explicit field declarations + assignment in the constructor body.
- Optional fields: use `if (value !== undefined) { this.field = value }`
  pattern, NOT direct assignment — `exactOptionalPropertyTypes` requires it.

Write test first. Test file alongside the entity.

### 2. Repository interface (no test needed)

Location: `src/application/repositories/FeatureRepository.ts`

Rules:

- Interface only, no implementation
- All methods take `tenantContext: TenantContext` as first parameter
- Return domain entities, never raw DTOs
- `Promise<T | null>` for nullable results

### 3. Use cases (TDD)

Location: `src/application/use-cases/feature/UseCaseName.ts`

Rules:

- One class per use case
- NO constructor parameter property shorthand:

```typescript
export class ListServices {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }
}
```

- Test with hand-written fake repositories (see admin-tdd-conventions skill)
- Add shared fake to `src/application/test-helpers/createFakeFeatureRepository.ts`

### 4. Wire into the container

Add to `AppContainer` interface and `createAppContainer()` in
`src/composition/container.ts`.

### 5. Infrastructure mapper (TDD)

Location: `src/infrastructure/mappers/featureMapper.ts`

- Pure function: `mapApiDtoToDomainEntity(dto: FeatureDto): Feature`
- Test every field mapping and every validation failure path

### 6. Infrastructure repository (TDD with MSW)

Location: `src/infrastructure/repositories/ApiFeatureRepository.ts`

- Implements the repository interface
- Takes `HttpClient` in constructor (explicit field pattern)
- Tests use MSW handlers in `src/test/mocks/handlers/featureHandlers.ts`
- Register handlers in `src/test/mocks/handlers/index.ts`

### 7. Presentation hook (TDD)

Built on `useAsync`. Get `tenantContext` from `useAuth()` inside a ProtectedRoute —
always non-null at this point.

### 8. Page component

Replace the stub. **`TagsPage`/`TagForm` is the reference implementation** —
copy its structure (table list + dialog create/edit form +
delete-with-confirm) rather than inventing a new pattern.

#### List = `Table`, form = `Dialog` — always

A page listing records renders a `Table` (`src/components/ui/table.tsx`):
one row per record, actions (Edit/Delete) as buttons in the last
column. Not stacked `Card`s per row — see `TagsPage`.

A create/edit form always opens in a `Dialog`
(`src/components/ui/dialog.tsx`) over the list — never inline in the
page, never its own route. Use one `Dialog` instance whose content
switches between create/edit based on which record (if any) triggered
it, rather than a dialog per row — see `TagsPage`'s `formTarget` state.
The form component itself (`TagForm`) stays a plain, dialog-agnostic
`<form>` — the page wires it into the `Dialog`, keeping the two
concerns separate.

A destructive action (delete) is confirmed with `AlertDialog`
(`src/components/ui/alert-dialog.tsx`) — never `window.confirm`. Same
one-instance-per-page pattern as the create/edit `Dialog`: a
`deleteTarget: Record | null` state opens it, `AlertDialogAction` runs
the actual delete. `AlertDialogAction`'s click auto-closes the dialog by
default — call `event.preventDefault()` in its `onClick` so the dialog
stays open (showing a loading/error state) until the delete call
actually resolves, then close it yourself on success. See `TagsPage`'s
`requestDelete`/`confirmDelete`.

#### Build from existing components — don't hand-roll markup, don't extend speculatively

shadcn/ui primitives live in `src/components/ui/` and are already themed:
`button`, `card`, `input`, `textarea`, `label`, `spinner`, `table`,
`dialog`, `alert-dialog`. If a page needs something not in that list
(select, badge, etc.), add it with `npx shadcn@latest add <component> -c apps/admin-frontend`
from the repo root, then check the result compiles under this project's
`exactOptionalPropertyTypes: true` (some generated files need fixing —
see `dropdown-menu.tsx`'s removal for an example of when to give up and
remove instead of patch).

Use generated files as the CLI writes them. Don't add a prop, variant,
or custom styling to a `src/components/ui/*` file unless a page
genuinely needs it right now — no speculative extensions "in case a
future page wants it." If a page needs a loading button or a
destructive-styled link, do it at the call site (a conditional
`<Spinner />` in `children`, a `className` override on an existing
`variant`) rather than growing the shared component's API.

Shared composites live in `src/presentation/components/` — reuse before
writing a new one:

| Component                     | Use for                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `PageHeader`                  | Title + primary action row at the top of every page             |
| `StatusMessage`               | Loading / empty / error text (`tone="error"` for errors)        |
| `TextField` / `TextAreaField` | Labeled form inputs (wraps shadcn `Label` + `Input`/`Textarea`) |
| `CenteredScreen`              | Full-page centered content (pre-auth screens only)              |
| `FullScreenSpinner`           | Full-page loading state                                         |
| `ThemeToggle`                 | Already in `AdminLayout` — don't add another one                |

`PlaceholderPage` is what the stub currently renders — delete its usage
from the page file once real content replaces it (leave the component
itself; other stubs still use it).

#### Use semantic tokens — never raw palette classes

This is the rule most likely to be missed and the one that silently
breaks dark mode. `src/index.css` defines the whole palette as CSS
variables, redefined under `.dark` — Tailwind classes like
`bg-background`/`text-foreground` resolve to the right color in both
themes automatically. A raw class like `bg-slate-50` or `text-slate-800`
does **not** — it's a fixed light-mode color that looks broken once a
user switches to dark.

| Instead of (stale, don't use)       | Use                           | For                           |
| ----------------------------------- | ----------------------------- | ----------------------------- |
| `bg-slate-50`                       | `bg-background`               | Page background               |
| `bg-white`                          | `bg-card`                     | Card/surface background       |
| `border-slate-200`                  | `border-border`               | Card and divider borders      |
| `text-slate-800`                    | `text-foreground`             | Headings, primary text        |
| `text-slate-600` / `text-slate-400` | `text-muted-foreground`       | Secondary/muted text          |
| `text-red-600`                      | `text-destructive`            | Error text                    |
| `bg-teal-600` / `text-teal-700`     | `text-primary` / `bg-primary` | Brand accent, primary buttons |

There's no brand color to special-case anymore — the whole app uses the
stock shadcn/ui neutral theme (see `docs/DECISIONS.md` "Design
language"). If in doubt, use a token; there's no exception to reach for.

#### Icons

Use `lucide-react` (already a dependency), matched to the icon already
used for this section in `AdminLayout`'s nav (`Sparkles` for Services,
`Users` for Clients, `CalendarDays` for Appointments, `Inbox` for Inbox,
`Settings` for Settings, `LayoutDashboard` for Dashboard). Always add
`aria-hidden="true"` on a decorative icon — see any nav item in
`AdminLayout.tsx` for the pattern.

#### Mobile responsiveness — every page must work at 375px wide

- `Table` already scrolls horizontally on its own
  (`data-slot="table-container"` wraps it in `overflow-x-auto`) — don't
  add a second scroll wrapper, and don't fight it by forcing columns to
  wrap or truncate unless a column's content is genuinely unbounded
  (see the `Description` column in `TagsPage`, `max-w-64 truncate`).
- `Dialog` is responsive by default (`max-w-[calc(100%-2rem)]` below its
  `sm:` breakpoint) — a form inside it doesn't need its own width
  handling.
- Any `flex` row inside a form that could get tight (a color picker, a
  button group) still needs `flex-wrap` — see `TagForm`'s color
  swatches and button row.
- Never use a fixed pixel width wider than ~300px without a responsive
  override. Prefer `w-full` + `max-w-*`.
- `AdminLayout` already handles the page shell (off-canvas sidebar below
  `md`) — pages don't need their own mobile nav handling, just don't
  break out of the `<main>` padding it provides.

#### States

Handle all three `useAsync` states: loading → `StatusMessage`, error →
`StatusMessage tone="error"`, success → real UI (see `TagsPage`).

#### Language — all user-facing text is Brazilian Portuguese (pt-BR)

Every string a user reads or a screen reader announces — headings,
button labels, `PageHeader`/`StatusMessage` text, form labels/hints,
`aria-label`s, `window.confirm` prompts, error-message fallbacks passed
to `messageFrom`-style helpers — is written in pt-BR. See `TagsPage`/
`TagForm` for the pattern (e.g. "Nova etiqueta", "Não foi possível
carregar as etiquetas", `aria-label="Cor ${paletteColor}"`).

Code stays in English as usual: identifiers, comments, commit messages,
this skill's own prose. Only what actually renders to the end user (or
reaches them through an error message) needs translating — a
`DomainError` thrown deep in an unreachable code path (see
`domain/entities/Tag.ts` vs. `domain/errors/InvalidTenantError.ts`
callers, traced in `docs/DECISIONS.md` "Language: pt-BR user-facing
text") doesn't need the same urgency as anything a `StatusMessage` or
`Dialog` can actually display, but translate it too when it's cheap to
do at the same time.

Nav labels (source of truth: `AdminLayout.tsx`'s `NAV_ITEMS`) are
Painel, Agendamentos, Serviços, Clientes, Caixa de entrada, Etiquetas,
Configurações — reuse the exact same word for a stub page's
`PlaceholderPage title` and for that vertical's `PageHeader title` once
built, so the sidebar and the page always agree.

---

## HttpClient (build before the first REST feature if missing)

```typescript
// src/infrastructure/http/HttpClient.ts
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
}
```

Implementation `AuthenticatedHttpClient`:

- Constructor takes `getAccessToken: () => Promise<string | null>`
- Prepends `VITE_API_BASE_URL` env var
- Attaches `Authorization: Bearer <token>`
- Throws typed `ApiError` (with `status`, `message`) on non-2xx
- Wire into `createAppContainer()` using `authRepository` to supply the token

---

## Commit checklist

- [ ] Domain entity: explicit field declarations, named errors, no framework deps
- [ ] Repository interface: `TenantContext` first param on all methods
- [ ] Use cases: explicit constructor body (no shorthand), tested with fakes
- [ ] Container: wired in interface and factory
- [ ] Mapper: tested, all fields and failure paths covered
- [ ] Infrastructure repo: tested with MSW, handler registered
- [ ] Hook: built on `useAsync`, tested with fake container
- [ ] Page: handles loading/error/success, built from shadcn/ui primitives
      and shared composites (not hand-rolled markup)
- [ ] List uses `Table`, form opens in a `Dialog` — not stacked `Card`s
      or an inline/routed form
- [ ] Destructive actions confirmed with `AlertDialog` — not `window.confirm`
- [ ] No prop/variant added to a `src/components/ui/*` file unless this
      page genuinely needs it right now
- [ ] Page: uses semantic tokens only — no raw `slate-*`/`teal-*`/etc.
      Tailwind palette classes (breaks dark mode)
- [ ] Page: checked in dark mode (toggle in the sidebar footer)
- [ ] Page: no horizontal overflow or clipped content at 375px wide
- [ ] All user-facing text (labels, messages, `aria-label`s, confirm
      prompts) is in pt-BR
- [ ] `npm run build` clean (catches TypeScript strict mode issues)
- [ ] `npm run lint` clean
- [ ] `npm run test` all green
