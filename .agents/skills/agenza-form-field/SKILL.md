---
name: agenza-form-field
description: Builds or changes admin-frontend forms with React Hook Form, Zod and the shared fields, including arrays, custom controls and server field errors (formulário, campo, validação, erro do backend no campo). Use when a form, its schema or its error handling changes. Not for page or route wiring (agenza-frontend-slice).
---

# Forms

Copy the live form closest to the change:
[ClientFormPage](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/) is a full
page with nested arrays and value presets, with its schema in `clientForm.ts`;
[TagForm](../../../apps/admin-frontend/src/features/tags/ui/components/TagForm/) is one form shared by
the route dialog (TagFormPage) and the creation from a selector (TagCreationDialog), so its schema
`tagForm.ts` lives with the shared component.

```text
- [ ] Schema, defaults and edit-to-field conversion beside the form they serve
- [ ] Domain limits and pure rules in the slice's model/; existing value schemas from shared/values
- [ ] RHF and submission in the page hook; submit guarded by isSubmitting and loading
- [ ] Fields from shared/form/fields with the form-values generic
- [ ] Unsuccessful submission goes through applyApiProblem; aliases declared when names differ
- [ ] Verification loop below passes
```

## Wire the form

- When schema input and output differ, use `z.input<typeof schema>` for fields/defaults and
  `z.output<typeof schema>` for submission, with `useForm<Input, unknown, Output>`; transforms and
  narrowing refinements make one `z.infer` insufficient.
- Return every editable field from the defaults/conversion function. The error bridge discovers paths
  from the current values, array items included; do not keep a second field list.
- Wrap the shell in `FormProvider`. A synchronous handler can call
  `void methods.handleSubmit(onValid)(event)` instead of passing a promise to the JSX handler.
- Use `DialogFormFooter` or `PageFormFooter` from
  [widgets/form-footer](../../../apps/admin-frontend/src/widgets/form-footer/) with the current
  `canSubmit` and `isSaving`.

An edit route reads its record from the backend and resets the form from that response; a list row is
not a fresh snapshot. Abort the read on cleanup, ignore an aborted answer and check whether the mounted
page can change `:id`, so loading or saving never uses the previous record. On a failed read, follow the
screen's recovery: existing forms toast the problem and close. A late successful save may publish its
result but must not navigate someone who already left; keep the mounted guard.

A saving dialog closes on no path: ignore `onOpenChange`, disable Cancelar and hide the close button.
Cancellation stays available while merely loading. This belongs to the form, not to the UI primitive.

## Choose and connect fields

Pass the form-values generic explicitly to
[shared/form/fields](../../../apps/admin-frontend/src/shared/form/fields/) so `name` is checked as
`Path<T>`; for a typed custom value, also pass the path to `ControlledField<T, N>` or `SelectField<T, N>`.

- Reuse a value preset with its schema for CPF, phone, e-mail and birth date. `MaskedField` displays
  `mask(value)` and stores `unmask(typed)`; a CPF stays digits in the form.
- `SelectField` and `SearchField` have an inline-label mode for toolbars, without hint or error line;
  never use it for a field that needs inline validation.
- Use `ControlledField` for another custom control. A new field declares its props type in its own file
  and is re-exported from the barrel
  ([form conventions](../../../apps/admin-frontend/docs/ARCHITECTURE.md#components-and-forms)).
- Forward RHF's `ref` and `onBlur` to the real focus target and keep `aria-invalid`/`aria-describedby`.
  A composite control without a labelable input needs `labelHtmlFor={false}` and its own accessible
  name, as in `ColorField`.
- Focus the first appropriate field when fields mount after a dialog read, and keep the primitive's
  keyboard behavior. Dates: [formatting](../agenza-ptbr-copy/references/formatting.md).
- With `useFieldArray`, render array-root errors in the section and check the paths after adding or
  removing items.

## Apply API errors without losing recovery data

This is the one home for the API-failure → form bridge.

- [formErrors.ts](../../../apps/admin-frontend/src/shared/api/formErrors.ts) matches API keys to current
  paths, normalizes indexed keys such as `guardians[1].name` and keeps the first entry's message, code
  and metadata. Unmatched keys, the command's own entry included, become form-level; it returns one
  general message and uses `title` only when nothing else was collected.
- [applyApiProblem.ts](../../../apps/admin-frontend/src/shared/form/applyApiProblem.ts) sets the code as
  the field error `type`, keeps `meta`, sets `root.serverError` when needed and focuses the first invalid
  field. Call `applyApiProblem({ problem, methods })` and render `FormErrorBanner` for the form-level
  message.
- A field submitted under another name needs `aliases`: declare `FieldAliases<FormFieldValues>` beside
  the schema transform (`{ tagIds: 'tags' }`). Only top-level command fields take an alias.
- Feature UI interprets its own codes and metadata, and checks a field's error code before using its
  metadata. In
  [ClientPersonSection](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx),
  `useFormState` observes the CPF/e-mail error; only the matching duplicate code and `meta.clientId`
  expose the recovery link, built from the encoded id with `NewTabLink`, never from a URL in metadata.

Show the contracted messages through the existing error components, branching on codes and typed
metadata, never on text.

## Verify

Exercise the affected paths with the colocated tests as reference: schema input/output, loading and
saving guards, dynamic paths, error focus, preserved metadata or keyboard interaction. From
`apps/admin-frontend/`, run the affected tests, `npm run lint` and `npm run build`, fix and repeat;
finish with `npm run test:coverage`. Dependency changes follow the
[lockfile procedure](../../../apps/admin-frontend/README.md#lockfile).
