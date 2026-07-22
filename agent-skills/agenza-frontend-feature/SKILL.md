---
name: agenza-frontend-feature
description: >
  Use whenever building or changing a feature in apps/admin-frontend —
  React components, pages, hooks, forms, Zod schemas, use cases, or HTTP
  calls. Trigger on "let's build [feature]", "implement [feature]", "add a
  page/form/hook", or when the user provides an API spec for a resource.
  Covers this project's Clean Architecture layering, React Hook Form + Zod
  forms, structured server-error-to-field mapping, out-of-order-response
  and inline-creation state handling, shadcn/ui usage, accessibility, dark
  mode, mobile, and pt-BR text rules. Do NOT proceed without reading it —
  several conventions here differ from generic React tutorials and from
  older, now-superseded guidance for this same project.
---

# Frontend Feature

A feature vertical in this project is a full slice:

```
domain/entities/          → plain TS class, no framework deps
application/repositories/ → interface (port)
application/use-cases/    → one class per use case, constructor-injected repo
infrastructure/repositories/ → implements the port via HttpClient
infrastructure/mappers/   → DTO → domain entity mapping function
presentation/hooks/       → useFeature built on useAsync
presentation/forms/       → react-hook-form + zod form component (if the feature has a form)
presentation/pages/       → replaces the stub page
```

For translating an external API spec into the DTO/mapper/MSW-handler seam,
use `.skills/admin-api-contract/SKILL.md` alongside this skill. For
TypeScript-strict-mode test gotchas and mock-strategy-per-layer rules, use
`.skills/admin-tdd-conventions/SKILL.md`. This skill governs everything
between those two: architecture, forms, state, UI, and completion
criteria.

---

## Pre-conditions before writing any code

1. **Get the API spec** from the user before touching infrastructure.
   Ask for: endpoint paths, HTTP methods, request shape, response shape,
   error codes/shapes. Never invent field names — this is one of the
   question-policy triggers in the root `AGENTS.md` (changes a contract).
2. **Check whether `HttpClient` exists** at
   `src/infrastructure/http/HttpClient.ts`. Every REST repository depends
   on it; build it first if missing.
3. **Identify which use cases the current page actually needs.** Don't
   build every possible use case upfront.

---

## Step-by-step build order

### 1. Domain entity (TDD)

`src/domain/entities/FeatureName.ts` — zero imports from React,
`application/`, `infrastructure/`, or `presentation/`. Private constructor
+ static `create(input)` factory that validates invariants and throws a
named `DomainError` subclass. No constructor parameter property shorthand
(`erasableSyntaxOnly`) — explicit field declarations + assignment in the
constructor body. Optional fields: `if (value !== undefined) { this.field
= value }`, never a direct assignment of a possibly-`undefined` value
(`exactOptionalPropertyTypes`). `strict: true` — never `any`; if a value's
shape is genuinely unknown at a boundary, type it `unknown` and narrow it,
never widen with `any`.

### 2. Repository interface (no test needed)

`src/application/repositories/FeatureRepository.ts` — interface only.
Every method takes `tenantContext: TenantContext` as its first parameter.
Returns domain entities, never raw DTOs. `Promise<T | null>` for nullable
results.

### 3. Use cases (TDD)

`src/application/use-cases/feature/UseCaseName.ts` — one class per use
case, explicit constructor body (no shorthand):

```typescript
export class ListServices {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }
}
```

Test with hand-written fake repositories (`.skills/admin-tdd-conventions`).
Add a shared fake to `src/application/test-helpers/createFakeFeatureRepository.ts`
after the second use case needs it.

### 4. Wire into the container

Add to the `AppContainer` interface and `createAppContainer()` in
`src/composition/container.ts` — the **only** place allowed to construct
concrete repository implementations.

### 5. Infrastructure mapper (TDD)

`src/infrastructure/mappers/featureMapper.ts` — pure function
`mapApiDtoToDomainEntity(dto: FeatureDto): Feature`. Test every field
mapping and every validation failure path.

### 6. Infrastructure repository (TDD with MSW)

`src/infrastructure/repositories/ApiFeatureRepository.ts` — implements
the port, takes `HttpClient` in its constructor (explicit field pattern).
Tests use MSW handlers in `src/test/mocks/handlers/featureHandlers.ts`,
registered in `src/test/mocks/handlers/index.ts`. `onUnhandledRequest:
'error'` is global — any call without a registered handler fails loudly.

### 7. Presentation hook (TDD) — build on `useAsync`, not a new pattern

`src/presentation/hooks/useAsync.ts` is the one shared "call an async
function, track loading/data/error" primitive — every feature hook is
built on it instead of a bespoke `useState`/`useEffect` pair or a server-
state library (see "Prohibited" below). It already handles the two things
that are easy to get wrong by hand:

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

Get `tenantContext` from `useAuth()` inside a `ProtectedRoute` — treat it
as possibly `null` in a hook (the page can mount while `useAuth()` is
still resolving), guard each method, and pass the tenant id as `useAsync`'s
`resetKey` so a tenant switch clears data instead of leaking the previous
tenant's rows onto screen even for one frame (multi-tenancy — see root
`AGENTS.md`).

### 8. Page component

Replace the stub. **`TagsPage`/`TagForm` is the reference implementation**
— copy its structure (table list + dialog create/edit form + delete-with-
confirm) rather than inventing a new pattern.

#### List = `Table`, form = `Dialog` — always

A page listing records renders a `Table` (`src/components/ui/table.tsx`):
one row per record, actions (Edit/Delete) as buttons in the last column —
not stacked `Card`s. A create/edit form always opens in a `Dialog`
(`src/components/ui/dialog.tsx`) over the list — never inline in the page,
never its own route. One `Dialog` instance whose content switches between
create/edit based on which record (if any) triggered it (`TagsPage`'s
`formTarget` state), not a dialog per row. The form component itself stays
dialog-agnostic — the page wires it into the `Dialog`.

A destructive action (delete) is confirmed with `AlertDialog`
(`src/components/ui/alert-dialog.tsx`) — never `window.confirm`. Same
one-instance-per-page pattern: a `deleteTarget: Record | null` state opens
it, `AlertDialogAction` runs the delete. Call `event.preventDefault()` in
its `onClick` (it auto-closes by default) so the dialog stays open showing
a loading/error state until the delete call resolves, then close it
yourself on success.

#### Forms: React Hook Form + Zod

Any form beyond a single trivial field uses `react-hook-form` +
`@hookform/resolvers/zod` — see `TagForm.tsx` for the exact shape:

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
- **Structured API errors, mapped to fields — never parsed from free
  text.** `src/presentation/forms/serverFormError.ts`'s
  `mapApiErrorToForm(error, fieldMap, codeFieldMap, fallbackMessage)`
  differentiates a 400 validation `ProblemDetails` (has an `errors` map —
  map each backend field name to the form's field via `fieldMap`) from a
  409/404/403 `ProblemDetails` (single `code` — map via `codeFieldMap`
  when the code names a specific field, e.g. a duplicate-name conflict
  highlighting the name field, otherwise it becomes a global message).
  Apply the result with `setError(field, { type: 'server', message })` in
  a `useEffect` keyed on the server-error object, and `setFocus(firstField)`
  so a screen-reader/keyboard user lands on the first invalid field
  instead of losing their position — see `TagForm`'s `serverError` effect.
- Don't reach for Formik or Yup without an explicit ADR — React Hook Form
  + Zod is the established, working pattern here (`docs/DECISIONS.md`).

#### Inline creation (a select that can create its own options)

`src/presentation/hooks/useCreateInline.ts` is the shared
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
`npx shadcn@latest add <component> -c apps/admin-frontend` from the repo
root, then check the result compiles under `exactOptionalPropertyTypes:
true` (some generated files need fixing — see `dropdown-menu.tsx`'s
removal for when to give up and remove instead of patch).

Use generated files as the CLI writes them. Don't add a prop, variant, or
custom styling to a `src/components/ui/*` file unless a page genuinely
needs it right now — no speculative extensions "in case a future page
wants it." Do it at the call site instead (a conditional `<Spinner />` in
`children`, a `className` override on an existing `variant`).

Shared composites live in `src/presentation/components/` — reuse before
writing a new one:

| Component                     | Use for                                                         |
| ------------------------------ | ------------------------------------------------------------------ |
| `PageHeader`                  | Title + primary action row at the top of every page             |
| `StatusMessage`               | Loading / empty / error text (`tone="error"` for errors)        |
| `TextField` / `TextAreaField` | Labeled form inputs (wraps shadcn `Label` + `Input`/`Textarea`) |
| `CenteredScreen`              | Full-page centered content (pre-auth screens only)              |
| `FullScreenSpinner`           | Full-page loading state                                         |
| `ThemeToggle`                 | Already in `AdminLayout` — don't add another one                |

Only create a new reusable component once a second page needs the exact
same pattern — a one-off stays local to its page until then.

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
`StatusMessage tone="error"`, success → real UI.

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
  `src/infrastructure/generated/services-api.d.ts` is generated from the
  backend's OpenAPI document (`npm run generate:api-types`); don't
  hand-write a parallel DTO type for something already generated, and
  don't let a hand-written one silently drift from it (see
  `agent-skills/agenza-api-contract-review`).
- A page importing another feature's internal module (`domain/`,
  `application/`, `infrastructure/` of a *different* page/feature) —
  share through `composition/container.ts` or a genuinely shared
  `presentation/components/` composite, never a direct cross-feature
  import.
- `any`, anywhere, including test files and fakes.

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

`AuthenticatedHttpClient`: constructor takes `getAccessToken: () =>
Promise<string | null>`, prepends `VITE_API_BASE_URL`, attaches
`Authorization: Bearer <token>`, throws a typed `ApiError` (`status`,
`message`, `details` — the parsed `ProblemDetails`, see `serverFormError.ts`)
on non-2xx. Wired into `createAppContainer()` using `authRepository` to
supply the token.

---

## Commit checklist

- [ ] Domain entity: explicit field declarations, named errors, no framework deps, no `any`
- [ ] Repository interface: `TenantContext` first param on all methods
- [ ] Use cases: explicit constructor body (no shorthand), tested with fakes
- [ ] Container: wired in interface and factory
- [ ] Mapper: tested, all fields and failure paths covered
- [ ] Infrastructure repo: tested with MSW, handler registered
- [ ] Hook: built on `useAsync`, tenant-scoped via `resetKey`, mutations
      use `mutate` for optimistic success decoupled from refetch failure
- [ ] Form (if any): React Hook Form + Zod, server errors mapped to
      fields via `mapApiErrorToForm`, `setFocus` on the first error
- [ ] Page: handles loading/error/success, built from shadcn/ui primitives
      and shared composites (not hand-rolled markup)
- [ ] List uses `Table`, form opens in a `Dialog` — not stacked `Card`s
      or an inline/routed form
- [ ] Destructive actions confirmed with `AlertDialog` — not `window.confirm`
- [ ] No prop/variant added to a `src/components/ui/*` file unless this
      page genuinely needs it right now
- [ ] Page: uses semantic tokens only — no raw `slate-*`/`teal-*`/etc.
- [ ] Page: checked in dark mode and at 375px wide, no horizontal overflow
- [ ] Page: keyboard-operable, decorative icons `aria-hidden`, every
      interactive element has an accessible name
- [ ] All user-facing text (labels, messages, `aria-label`s, confirm
      prompts) is in pt-BR
- [ ] No cross-feature import, no hand-duplicated generated contract, no
      new global client-state store
- [ ] `npm run build` clean (catches TypeScript strict mode issues)
- [ ] `npm run lint` clean
- [ ] `npm run test` all green — behavioral assertions, not implementation details
