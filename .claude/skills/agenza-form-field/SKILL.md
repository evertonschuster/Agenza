---
name: agenza-form-field
description: Use when building or changing a form in admin-frontend — wiring React Hook Form + Zod for a new entity, adding a field with shared/ui/form-field/ (TextField, TextareaField, ControlledField, ColorField), deciding whether a custom control needs its own XField specialization, or feeding a backend ApiProblem back into the form via applyApiProblem.
---

# Forms — React Hook Form + Zod + `shared/ui/form-field/`

`TagFormPage` (`src/features/tags/ui/pages/TagFormPage/`) is the reference implementation and, as of
this writing, the **only** consumer of everything described here. Read
[`docs/ARCHITECTURE.md` §5](../../../apps/admin-frontend/docs/ARCHITECTURE.md) (the "Tag create/edit
UI reintroduced on React Hook Form + Zod" row and the row right after it) for the decision history
and the two gotchas below in their original context, and §6's "Provisional" section for what's still
unproven with only one consumer.

## The three layers, one job each

| Layer | File | Job |
| --- | --- | --- |
| Error mapping | `shared/api/formErrors.ts` | `toFormErrors<F>(problem, fields)` — `ApiProblem` → `{fieldErrors, formError}`. Knows `ApiProblem`, nothing about RHF. |
| RHF bridge | `shared/form/applyApiProblem.ts` | `applyApiProblem<T>(problem, fields, setError)` — calls the above, then `setError` per field plus `setError('root.serverError', …)`. Knows both shapes; the only file that does. |
| Field components | `shared/ui/form-field/` | `FormField` (base), `TextField`/`TextareaField`, `ControlledField`, `ColorField`, `FormErrorBanner`. Presentational + RHF wiring, zero domain knowledge — same "no business logic" rule as the rest of `shared/ui/` (`agenza-ui-primitive`), just now also RHF-aware. |

Never let a field component or `shared/form/` read `problem.errors` directly — that parsing (PascalCase
keys, the collapsed `""` key for a 409/404) lives in `formErrors.ts` alone. See `agenza-api-contract`'s
`references/errors.md` for that taxonomy in full.

## Wiring a new entity's form

1. **Schema** in that entity's `model/<entity>Form.ts`, mirroring `tagForm.ts`:
   ```ts
   export const xFormSchema = z.object({ /* z.string().trim().min(1, '…') etc */ });
   export type XFormFieldValues = z.input<typeof xFormSchema>;
   export type XFormValues = z.output<typeof xFormSchema>;
   export const X_FORM_FIELDS = Object.keys(xFormSchema.shape) as readonly Path<XFormFieldValues>[];
   ```
   **Use `z.input`/`z.output`, never a single `z.infer`, the moment the schema has a `.refine()` or
   `.transform()`.** See Gotcha 1 below — this is not optional once either is present.

2. **Type-instantiate the field components once**, next to the schema:
   ```ts
   export const XTextField = TextField<XFormFieldValues>;
   export const XColorField = ColorField<XFormFieldValues>; // or ControlledField, if no specialization fits yet
   ```
   Pure type specialization, zero runtime cost — this is what lets `<XTextField name="…" label="…">`
   work with no generic argument at every call site.

3. **The page's hook** (`use<X>FormPage.ts`) calls RHF directly:
   ```ts
   const methods = useForm<XFormFieldValues, unknown, XFormValues>({
     resolver: zodResolver(xFormSchema),
     defaultValues: { /* … */ },
   });

   async function onValid(values: XFormValues) {
     const result = tag ? await xRepository.update(id, values) : await xRepository.create(values);
     if (result.ok) { /* publish, toast, navigate */ return; }
     applyApiProblem<XFormFieldValues>(result.error, X_FORM_FIELDS, methods.setError);
   }

   return { methods, onSubmit: (event) => void methods.handleSubmit(onValid)(event), /* … */ };
   ```
   The `(event) => void handler(event)` wrap is not style — passing `methods.handleSubmit(onValid)`
   (a `Promise`-returning function) directly to `onSubmit` trips
   `@typescript-eslint/no-misused-promises`. `tsc` alone won't catch this; only `npm run lint` will.

4. **The page shell** wraps its `<form>` in `<FormProvider {...methods}>` — every field component reads
   `register`/`control`/`errors` via `useFormContext()`, not as props. A form-level error is
   `<FormErrorBanner />` — no props, it reads `root.serverError` from context itself and renders
   nothing when there isn't one.

5. **Fields are configuration**, not markup:
   ```tsx
   <XTextField name="name" label="Nome" hint="…" maxLength={40} placeholder="…" />
   <XColorField name="color" label="Cor" aria-label="Cor…" options={PALETTE} />
   ```
   A native-input field (`register()`-bound) is `TextField`/`TextareaField`. A custom control needs
   `ControlledField` (pass a render function) or a named specialization built on top of it, per the
   rule below.

## Editing an existing entity: fetch fresh, don't trust what the list already had

An edit route fetches its own record from the backend on mount — it does not reuse whatever the list
row happened to be holding (router navigation state, a cached list item). The list might be stale
(paginated, or changed by someone else since); the edit form's job is to show what the backend has
*now*. The hook's return type is a discriminated union with a `'loading'` member so the page can show
a real loading state instead of either blank fields or briefly-wrong ones:

```ts
export type UseXFormPageResult =
  | { status: 'loading'; onOpenChange: (open: boolean) => void }
  | { status: 'ready'; methods: UseFormReturn<XFormFieldValues, unknown, XFormValues>; /* … */ };
```

`useForm`'s own `defaultValues` are captured once, synchronously, at mount — they can't wait for an
async fetch. Fetch in a `useEffect` keyed on the id (the same `ignore`-flag-in-cleanup shape every
other one-shot fetch in this app uses), and call `methods.reset(values)` once it resolves; don't reach
for RHF's async-`defaultValues`-promise feature — it doesn't compose with this app's `ApiResult`
never-throws model, and every other fetch here is a plain effect + explicit status, not a
framework-owned loading flag. A failed fetch (not-found, or any other `ApiProblem`) is not an inline
error state — same as everywhere else in this app that fetches, it toasts the backend's own `title`
verbatim and navigates back, no retry affordance.

The page renders `<FormFieldsSkeleton fieldCount={N} />` for the `'loading'` branch — one label+control
skeleton row per field, matching `list-section`'s own skeleton convention (`aria-busy`, `aria-live`).
Keep the dialog's Cancelar button working during loading (own `onOpenChange`, not gated on the form
being ready) — the person should never be stuck in a dialog they can't close because a fetch hasn't
resolved yet.

## When to build a new `XField` specialization vs. use `ControlledField` directly

`ControlledField` is the generic escape hatch — any custom control, at the cost of a render function
at every call site. `ColorField` is what a specialization looks like: it exists because the ask was
for call sites to read as configuration, and it was justified by having a real consumer (`ColorField`
itself became `ControlledField`'s first consumer, so `ControlledField` didn't ship speculative).

**Don't build a second specialization until a second real control needs it.** Same bias this codebase
already applies to `entities/` and to not rebuilding `color-swatch-picker` before something used it
(ARCHITECTURE §1, §5) — a one-off specialization for a control only `ControlledField` has ever wrapped
is guessing at an API shape with a sample size of one.

## Two gotchas, both caught by `tsc`/review, not by a test

**1. `z.infer` is not enough once a schema has `.refine()` or `.transform()`.** A schema's *input*
shape (what `register()`/`Controller`/`defaultValues` actually hold) and *output* shape (what
`onSubmit` receives after Zod runs) diverge the moment either is present —
`tagFormSchema`'s `color` (`.refine` narrows `string | null` → `string`) and `description`
(`.transform` turns `'' | whitespace` → `null`) both do. `useForm<TFieldValues, TContext,
TTransformedValues>` needs the input shape as its first generic, the output shape as its third.
Modeling both as one `z.infer<typeof schema>` type — the natural first guess — compiles right up
until `resolver: zodResolver(schema)` is attached to `useForm`, where `tsc` names a `Resolver<Input,
any, Output>` mismatch. Fix: `z.input<typeof schema>` for the field components and
`applyApiProblem`'s generic, `z.output<typeof schema>` for `onValid`'s parameter — see
`TagFormFieldValues`/`TagFormValues` in `tagForm.ts`.

**2. Not every control accepts `id`/`htmlFor`.** `FormField`'s `<Label htmlFor={id}>` assumes the
control underneath can take that `id` — true for `Input`/`Textarea`, false for anything shaped like a
composite ARIA widget (a radiogroup, a listbox) with no single focusable element to point a label at.
`ColorSwatchPicker` has no `id` prop in its own type; a naive reuse of `FormField` for it renders a
`<label>` pointing at nothing. `labelHtmlFor?: boolean` on `FormField`/`ControlledField` (default
`true`) is the escape valve — `ColorField` passes `false` and relies on `aria-label` instead, same
as the pre-RHF Cor field did by hand.

## Testing

No new tier — `agenza-testing`'s existing "component whose behaviour is context-driven" tier already
covers this: RTL `render` inside the relevant provider. For a field component that's not just base
`FormField`, the provider is a small `<FormProvider>` test harness, not `MemoryRouter`:

```tsx
function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { /* … */ } });
  useEffect(() => {
    if (withError) methods.setError('name', { type: 'test', message: 'Erro de teste' });
  }, [withError, methods]);
  return (
    <FormProvider {...methods}>
      <TextField name="name" label="Nome" />
    </FormProvider>
  );
}
```

Worked examples: `text-fields.test.tsx`, `controlled-field.test.tsx`, `color-field.test.tsx`,
`form-error-banner.test.tsx` in
`shared/ui/form-field/components/`. A dummy `FieldValues` shape local to the test file is enough —
these components are generic, so a real entity's schema is never needed to test them.

## Before you push

`npm run lint && npx tsc --noEmit && npm run format:check && npm run test:coverage`, from
`apps/admin-frontend/`. `shared/ui/form-field/**` is in `vitest.config.ts`'s `coverage.exclude` (pure
prop-driven renderers, same reasoning as `link-button`/`empty-state`) — `shared/api/formErrors.ts` and
`shared/form/applyApiProblem.ts` are not, and carry real logic, so they're expected to show up in the
coverage number like any other `shared/` file with behaviour.

If this is the **first** form for a new entity and you're adding `react-hook-form` /
`@hookform/resolvers` / `zod` to a workspace that doesn't have them yet (it won't be — `tags` already
pulled all three in) — or any other new dependency — regenerate the lockfile in the Linux container per
[`AGENTS.md`](../../../apps/admin-frontend/AGENTS.md), not on Windows.
