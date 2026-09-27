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
   export const X_FORM_FIELDS = xFormSchema.keyof().options;

   export function toXFormFieldValues(x?: X): XFormFieldValues {
     return { name: x?.name ?? '', description: x?.description ?? '' };
   }
   ```
   **Use `z.input`/`z.output`, never a single `z.infer`, the moment the schema has a `.refine()` or
   `.transform()`.** See Gotcha 1 below — this is not optional once either is present.
   `keyof().options` is already typed as the key union, so the model needs no `as` cast and no
   `react-hook-form` import — `model/` stays library-free. `toXFormFieldValues` is the inverse of the
   schema's `.transform()`s (a `null` description back to `''`) and sits beside them: `useForm`'s
   `defaultValues` is `toXFormFieldValues()`, the edit fetch's `reset` is `toXFormFieldValues(entity)`.

2. **The page's hook** (`use<X>FormPage.ts`) calls RHF directly:
   ```ts
   const { id } = useParams();
   const isEdit = id !== undefined;
   const methods = useForm<XFormFieldValues, unknown, XFormValues>({
     resolver: zodResolver(xFormSchema),
     defaultValues: toXFormFieldValues(),
   });
   const isSaving = methods.formState.isSubmitting;
   const canSubmit = !isLoading && !isSaving;

   async function onValid(values: XFormValues) {
     const result = isEdit ? await xRepository.update(id, values) : await xRepository.create(values);
     if (result.ok) { /* publish, toast, navigate */ return; }
     applyApiProblem<XFormFieldValues>(result.error, X_FORM_FIELDS, methods.setError);
   }

   function submit(event?: SubmitEvent<HTMLFormElement>) {
     event?.preventDefault();
     if (canSubmit) void methods.handleSubmit(onValid)(event);
   }

   useShortcut(SAVE_SHORTCUT_ID, 's', 'Salvar x', submit, { modified: true });

   return { methods, isSaving, canSubmit, onSubmit: submit, /* … */ };
   ```
   `SAVE_SHORTCUT_ID` is a module-level `export const` of the hook file — the hook registers it, the
   footer hands the same id to `ActionButton`.
   The route's `id` — never a fetched copy of the entity — decides create vs. update, so the form
   can't write to a record other than the one in the URL. The `void` inside `submit` is not style —
   handing `methods.handleSubmit(onValid)` (a `Promise`-returning function) straight to `onSubmit`
   trips `@typescript-eslint/no-misused-promises`; `tsc` alone won't catch it, only `npm run lint`.

   **Save is `Ctrl+S` / `⌘S`, through the same `submit`.** Mnemonic per the W3C APG; `Ctrl+Enter` is
   out, the APG lists modifier + Enter as an OS conflict. `canSubmit` is the one rule behind both the
   button's `disabled` and the shortcut — a shortcut on a disabled control must be inert (MDN,
   `aria-keyshortcuts`). The footer is two lines of configuration:
   ```tsx
   <DialogClose disabled={isSaving} render={<Button variant="outline" />}>Cancelar</DialogClose>
   <ActionButton type="submit" disabled={!canSubmit} pending={isSaving} shortcutId={SAVE_SHORTCUT_ID}>
     {isSaving ? 'Salvando…' : 'Salvar'}
   </ActionButton>
   ```
   `ActionButton` reads the keycap and `aria-keyshortcuts` from the registry by id (a dialog's confirm
   is a resting-keycap tier, `agenza-ui-primitive` §5) and turns `pending` into spinner + disabled.

   **While saving, the dialog offers no way out** — a Cancelar clicked mid-request would close the
   dialog while the save still lands, a Cancel that doesn't cancel. Three lines, all with APIs the
   dialog already had: the hook's `onOpenChange` ignores a close while `isSaving` (a controlled dialog
   stays open when its handler doesn't close it, which covers Esc and outside press), Cancelar is
   `<DialogClose disabled={isSaving}>`, and the shell passes `showCloseButton={!isSaving}` to
   `DialogContent`. `shared/ui/dialog` itself stays a plain wrapper — a `busy` prop with a context was
   tried there and reverted as more machinery than three lines per dialog.

3. **The page shell** wraps its `<form>` in `<FormProvider {...methods}>` — every field component reads
   `register`/`control`/`errors` via `useFormContext()`, not as props. A form-level error is
   `<FormErrorBanner />` — no props, it reads `root.serverError` from context itself and renders
   nothing when there isn't one.

4. **Fields are configuration**, not markup. Import the generic components straight from
   `shared/ui/form-field` — there's no per-entity instantiation step — and give each one the form's
   field-values type as an explicit JSX type argument:
   ```tsx
   import { ColorField, TextField } from '@/shared/ui/form-field';
   import type { XFormFieldValues } from '../../model/xForm';

   <TextField<XFormFieldValues> name="name" label="Nome" hint="…" maxLength={40} placeholder="…" />
   <ColorField<XFormFieldValues> name="color" label="Cor" aria-label="Cor…" options={PALETTE} />
   ```
   The type argument is what makes `name` type-check against `Path<XFormFieldValues>` — a bare
   `<TextField name="name" …>` with no argument still compiles (`T` falls back to the unconstrained
   `FieldValues`), but silently accepts any string as `name`, losing the one thing worth keeping. A
   native-input field (`register()`-bound) is `TextField`/`TextareaField`. A custom control needs
   `ControlledField` (pass a render function) or a named specialization built on top of it, per the
   rule below.

## Editing an existing entity: fetch fresh, don't trust what the list already had

An edit route fetches its own record from the backend on mount — it does not reuse whatever the list
row happened to be holding (router navigation state, a cached list item). The list might be stale
(paginated, or changed by someone else since); the edit form's job is to show what the backend has
*now*. The hook returns a flat result whose `status` is **derived**, not stored: the hook keeps the id
of the record currently in the form (`loadedId`) and reports `'loading'` while `isEdit && loadedId !==
id` — the same "compare the in-flight key with the last resolved one" shape as `useTagListPage`. React
Router keeps the page mounted when only `:id` changes, so a status set once at mount would keep the old
record on screen, Salvar enabled, while the new one loads; the derived one can't.

`useForm`'s own `defaultValues` are captured once, synchronously, at mount — they can't wait for an
async fetch. Fetch in a `useEffect` keyed on the id (the same `ignore`-flag-in-cleanup shape every
other one-shot fetch in this app uses), and call `methods.reset(values)` once it resolves; don't reach
for RHF's async-`defaultValues`-promise feature — it doesn't compose with this app's `ApiResult`
never-throws model, and every other fetch here is a plain effect + explicit status, not a
framework-owned loading flag. A failed fetch (not-found, or any other `ApiProblem`) is not an inline
error state — same as everywhere else in this app that fetches, it toasts the backend's own `title`
verbatim and navigates back, no retry affordance.

The page renders `<FormFieldsSkeleton fieldCount={X_FORM_FIELDS.length} />` for the `'loading'`
branch — one label+control skeleton row per field, matching `list-section`'s own skeleton convention
(`aria-busy`, `aria-live`). Keep the dialog's Cancelar button working during loading (own
`onOpenChange`, not gated on the form being ready) — the person should never be stuck in a dialog
they can't close because a fetch hasn't resolved yet. Give the first field `autoFocus`: in edit mode
the fields mount only after the fetch, and without it keyboard focus stays on Cancelar.

A custom control's specialization must forward `field.ref` (and `field.onBlur`) from `ControlledField`
to the element that should receive focus — otherwise React Hook Form's focus-on-error silently skips
it. `ColorField` → `ColorSwatchPicker` puts the ref on the radiogroup's tab stop.

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
