# Page and UI conventions

Read this before building any page, form, or UI component — see
[../SKILL.md](../SKILL.md) step 8 for where this fits in the build order.

## Page component

Replace the stub. **`CategoriesListPage`/`CategoryEditorDialog`
(`features/catalog/presentation/categories/`) is the reference for
behavior and design** (search → table → dialog create/edit →
`AlertDialog` delete-confirm, loading/error/empty states) — **not for
anatomy**. Copy the _pattern_, not the file count: a feature with more
independent workflows legitimately needs more files than Categories does.
See "Componentization" below for when and how to split a page's
controller hook, form, and dialog.

### List = `Table`; form = `Dialog` by default

A page listing records renders a `Table` (`src/components/ui/table.tsx`):
one row per record, actions (Edit/Delete) as buttons in the last column —
not stacked `Card`s. A create/edit form opens in a `Dialog`
(`src/components/ui/dialog.tsx`) over the list by default. One `Dialog`
instance switches between create/edit based on which record triggered it,
not a dialog per row. The form component stays dialog-agnostic.

Categories maps `/categories/new` and `/categories/:id/edit` to the same
nested editor `Dialog` over the still-mounted `/categories` list
(docs/adr/012). `CategoryEditorDialog` renders one `CategoryForm` and
`useCategoryEditor` selects create or update from the route. In edit mode
`useCategoryEditor` fetches its own category directly via
`GET /api/v1/categories/{id}` — it does **not** read the list's data
through outlet context (docs/adr/013 superseded that shape; a
`useOutletContext<T>()` cast has no runtime guarantee an ancestor route
actually supplied a value). `useCategoriesListPage` refetches the list
unconditionally whenever navigation returns from the editor route back to
the bare `/categories` route, whether the editor closed via cancel or a
successful save. Its smartphone table uses labelled icon actions with
larger touch targets and reveals action text from `sm` upward.

A destructive action (delete) is confirmed with the shared
`DeleteConfirmationDialog` (`shared/presentation/components/`, built on
`AlertDialog`) — never `window.confirm`, and never a hand-rolled
`AlertDialog` per feature once `DeleteConfirmationDialog` already covers
the shape. Pair it with the shared `useDeleteConfirmation`
(`shared/presentation/hooks/`) for the target/progress/error state
machine behind it.

### Componentization — page shell, controller hook, promotion rule

- A page component (`XPage.tsx`) is a **composition shell**: it renders
  presentational components wired to a controller hook's view models, and
  nothing else — no `useState`, no business logic, no direct repository/
  use-case calls.
- A controller hook (`useXPage`) follows the same single-responsibility
  bar as any other code: when it accumulates more than one real workflow
  (search/filter state, an editor with dirty-tracking, a deletion
  confirmation are three _different_ concerns), split it into focused
  hooks (`useXFilters`, `useXEditor`, `useXDeletion`) that the page's
  composer hook assembles — see `features/catalog/presentation/services/hooks/`
  for the reference (`useServicesPage` composing `useServiceFilters` +
  `useServiceEditor` + `useServiceDeletion`).
- Extract a component or hook on its **first** use if it's already a
  distinct concern (a field group, a delete dialog) — keep it
  feature-local (e.g. `features/catalog/presentation/services/components/
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
  across features (see the shared hooks/components list below), never a
  generic page shape.

### Forms: React Hook Form + Zod

Any form beyond a single trivial field uses `react-hook-form` +
`@hookform/resolvers/zod` — see `CategoryForm.tsx`
(`features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/`)
for the exact shape:

```typescript
const categoryFormSchema = z.object({
  name: z.string().trim().min(1, NAME_MESSAGE).max(60, NAME_MESSAGE),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const {
  register,
  handleSubmit,
  setError,
  setFocus,
  formState: { errors },
} = useForm<CategoryFormValues>({
  resolver: zodResolver(categoryFormSchema),
  defaultValues: initialValues,
  mode: "onTouched",
  reValidateMode: "onChange",
});
```

(A field wired through `Controller` instead of `register` — e.g. a
`Select`, a color swatch group, a multi-value picker — also destructures
`control` from `useForm`; `CategoryForm` doesn't need one since its only
field is a plain text input.)

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
  first invalid field instead of losing their position — see
  `CategoryForm`'s `serverError` effect.
- Don't reach for Formik or Yup without an explicit ADR — React Hook Form
  - Zod is the established, working pattern here (`docs/DECISIONS.md`).

### Inline creation (a select that can create its own options)

`shared/presentation/hooks/useCreateInline.ts` is the shared
`isCreating`/`serverError`/`create`/`reset` state machine behind any
"create a related record without leaving this form" flow
(`CreatableSingleSelect`/`CreatableMultiSelect`). It keeps the outer
form's already-typed values untouched and keeps the popover open to show
an error, instead of every entity reinventing this. Reuse it — don't
hand-roll a second inline-create state machine, and don't let an inline
create's error/loading state leak into or reset the outer form.

### Build from existing components — don't hand-roll markup, don't extend speculatively

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

| Component                     | Use for                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| `PageHeader`                  | Title + primary action row at the top of every page                 |
| `StatusMessage`               | Loading / empty / error text (`tone="error"` for errors)            |
| `CollectionFeedback`          | Loading/error/empty/last-known-good states for a tenant-scoped list |
| `DeleteConfirmationDialog`    | Destructive-action `AlertDialog`, wired to `useDeleteConfirmation`  |
| `TextField` / `TextAreaField` | Labeled form inputs (wraps shadcn `Label` + `Input`/`Textarea`)     |
| `CenteredScreen`              | Full-page centered content (pre-auth screens only)                  |
| `FullScreenSpinner`           | Full-page loading state                                             |
| `ThemeToggle`                 | Already in `AdminLayout` — don't add another one                    |

Only promote a one-off to `shared/` once a second, genuinely identical
use appears (see "Componentization" above) — until then it stays
feature-local.

### Use semantic tokens — never raw palette classes

`src/index.css` defines the whole palette as CSS variables, redefined
under `.dark` — `bg-background`/`text-foreground` etc. resolve correctly
in both themes automatically. A raw class like `bg-slate-50` does not —
it's a fixed light-mode color that breaks the moment a user switches to
dark.

| Instead of (stale, don't use)       | Use                           | For                           |
| ----------------------------------- | ------------------------------ | ----------------------------- |
| `bg-slate-50`                       | `bg-background`               | Page background               |
| `bg-white`                          | `bg-card`                     | Card/surface background       |
| `border-slate-200`                  | `border-border`               | Card and divider borders      |
| `text-slate-800`                    | `text-foreground`             | Headings, primary text        |
| `text-slate-600` / `text-slate-400` | `text-muted-foreground`       | Secondary/muted text          |
| `text-red-600`                      | `text-destructive`            | Error text                    |
| `bg-teal-600` / `text-teal-700`     | `text-primary` / `bg-primary` | Brand accent, primary buttons |

There is no brand color to special-case — the app uses the stock
shadcn/ui neutral theme. If in doubt, use a token.

### Icons and accessibility

`lucide-react`, matched to the icon already used for this section in
`AdminLayout`'s nav. Always add `aria-hidden="true"` on a decorative icon.
Every interactive element needs a real accessible name (visible label,
`aria-label`, or `sr-only` text) and must be reachable and operable by
keyboard alone — tab order, `Enter`/`Space` activation, `Escape` closing a
`Dialog`/`AlertDialog`/popover (Radix primitives give you this for free;
don't fight it with a custom `onKeyDown` unless a page genuinely needs
one). Check color contrast against both themes when introducing any new
non-token color.

### Mobile responsiveness — every page must work at 375px wide

- `Table` already scrolls horizontally on its own
  (`data-slot="table-container"` wraps it in `overflow-x-auto`) — don't
  add a second scroll wrapper.
- `Dialog` is responsive by default (`max-w-[calc(100%-2rem)]` below its
  `sm:` breakpoint).
- Any `flex` row inside a form that could get tight still needs
  `flex-wrap` — see `CategoryForm`'s button row.
- Never use a fixed pixel width wider than ~300px without a responsive
  override. Prefer `w-full` + `max-w-*`.
- `AdminLayout` already handles the page shell (off-canvas sidebar below
  `md`) — pages don't need their own mobile nav handling.

### States

Handle all three `useAsync` states: loading → `StatusMessage`, error →
`StatusMessage tone="error"`, success → real UI (or `CollectionFeedback`
for a tenant-scoped list, which also covers the empty and
last-known-good-after-a-failed-refresh states).

### Language — all user-facing text is Brazilian Portuguese (pt-BR)

Every string a user reads or a screen reader announces — headings, button
labels, `PageHeader`/`StatusMessage` text, form labels/hints,
`aria-label`s, confirm prompts, error-message fallbacks — is pt-BR. See
`CategoriesListPage`/`CategoryEditorDialog` for the pattern (e.g. "Nova
categoria", `aria-label={\`Excluir categoria ${category.name}\`}`). Code
stays in English: identifiers, comments, commit
messages, this skill's own prose.

Nav labels (source of truth: `AdminLayout.tsx`'s `NAV_ITEMS`) are Painel,
Agendamentos, Serviços, Categorias, Clientes, Caixa de entrada,
Configurações — reuse the exact same word for a stub page's
`PlaceholderPage title` and for that vertical's `PageHeader title` once
built.
