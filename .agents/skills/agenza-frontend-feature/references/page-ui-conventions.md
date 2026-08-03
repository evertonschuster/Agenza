# Page and UI conventions

Read this reference only for page, form, dialog, table, component, or visual
behavior changes.

## Composition

- A routed page is a composition shell. It renders view models and callbacks
  from a controller hook; it does not call repositories or infrastructure.
- Split a controller when it owns more than one independent workflow, such as
  filtering, editing, deletion, or dirty-state confirmation. There is no
  line-count threshold.
- Extract a distinct concern locally on first use. Promote it to `shared/` only
  after a second genuinely identical use across features.
- Keep shared controller/component shapes in a neutral feature-local module;
  neither side imports the other's internal type.
- Do not build a generic CRUD page. Reuse proven behaviors and primitives, not
  an entity configuration object.

Categories is the current implemented CRUD reference. Inspect its live files
under `features/catalog/presentation/categories/` rather than copying a folder
layout described in documentation.

## Interaction patterns

- Lists use the existing shadcn `Table`. Destructive actions use the shared
  confirmation dialog rather than `window.confirm` or a feature-specific copy.
- Create/edit uses one form implementation. A dialog is the default interaction;
  use routing when navigation, deep-linking, or refresh behavior justifies it
  and record a reusable architectural change in an ADR.
- Preserve last-known-good data during refresh failures when the current shared
  collection feedback component supports it.

## Forms

- Non-trivial forms use React Hook Form and Zod with `noValidate` on the form.
- The form orchestrator owns `useForm`, submit, and server-error application.
  Field-group components consume the same form through `FormProvider` when
  prop-drilling would otherwise repeat form internals.
- Map structured backend field/code errors through the shared form-error helper.
  Focus the first invalid field. Never parse free-text backend messages.
- A component controlled through RHF `Controller` forwards its ref to a real
  focusable DOM element.
- Keep an inline-create workflow's pending/error state separate from the outer
  form. Do not invent a shared abstraction until a live second use proves it.

## Existing UI

- Prefer `src/components/ui/` primitives and then
  `shared/presentation/components/`. Inspect the directories for the current
  inventory; do not maintain a duplicate component list here.
- Add shadcn components with the version pinned in `package.json`, never
  `@latest`. Keep generated primitives close to upstream and solve one-off
  styling at the call site.
- Use semantic tokens such as `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, and `text-destructive`. Raw palette
  classes break theme portability.

## Accessibility and responsive behavior

- Every interactive element has a visible or programmatic accessible name and
  works by keyboard. Decorative icons use `aria-hidden="true"`.
- Prefer Radix interaction behavior over custom keyboard handlers.
- Add `jest-axe` coverage to new or materially changed routed pages/forms and
  verify focus movement for server validation errors.
- Verify light and dark themes and a 375 px viewport. Avoid fixed widths that
  overflow; use the existing table/dialog responsiveness before adding wrappers.

## Language and comments

User-visible and assistive strings are pt-BR; code identifiers remain English.
Comments default to zero and explain only a non-obvious security, concurrency,
library, browser, or lint constraint. Put architectural rationale in an ADR.
