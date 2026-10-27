---
name: agenza-form-field
description: Build or change admin-frontend forms with React Hook Form, Zod and shared fields, including dynamic arrays, custom controls and API field errors.
---

# Forms

Use the live [TagFormPage](../../../apps/admin-frontend/src/features/tags/ui/pages/TagFormPage/)
for a dialog form and [ClientFormPage](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/)
for a full-page form with nested arrays and value presets. Read only the parts relevant to the change.

## Wire the form

- Keep reusable domain limits and pure rules in the slice's `model/`; keep the page's Zod schema,
  defaults and edit-to-field conversion beside the form page. Reuse schemas and parsers from
  [shared/values](../../../apps/admin-frontend/src/shared/values/) for existing value types instead
  of adding another regex or conversion.
- When schema input and output differ, use `z.input<typeof schema>` for fields/defaults and
  `z.output<typeof schema>` for submission, with `useForm<Input, unknown, Output>`. Transforms and
  narrowing refinements can make one `z.infer` type insufficient; follow `tagForm.ts`.
- Return all editable fields from the defaults/conversion function. The error bridge discovers
  paths from the current form values, including array items; do not maintain a second field list.
- Keep RHF and submission logic in the page hook; wrap the shell in `FormProvider`. Use
  `formState.isSubmitting` and the loading state to guard both the submit handler and submit button.
  A synchronous handler can call `void methods.handleSubmit(onValid)(event)` without passing a
  promise-returning function directly to the JSX handler.
- Use `DialogFormFooter` or `PageFormFooter` from
  [widgets/form-footer](../../../apps/admin-frontend/src/widgets/form-footer/), passing the current
  `canSubmit` and `isSaving`. Use the footer's current props rather than copying an old call site.

An edit route fetches its record from the backend and resets the form from that response; a list row
is not a fresh snapshot for editing. Abort the read in effect cleanup and ignore an aborted response. Check
whether the mounted page can change `:id`, so loading or submission cannot silently use the previous
record. On a failed read, follow the owning screen's recovery flow; the existing forms toast the
problem and close/back out. A late successful save may publish its result, but must not navigate a
user who already left the page; preserve the existing mounted guard.

For a saving dialog, cover every close path: ignore closing in `onOpenChange`, disable Cancelar and
hide the close button. Keep cancellation available while merely loading. This belongs in the form
using the dialog, without adding a busy context to the UI primitive.

## Choose and connect fields

Use [shared/form/fields](../../../apps/admin-frontend/src/shared/form/fields/) for field configuration.
Pass the form-values generic explicitly so `name` is checked as `Path<T>`; for a typed custom value,
also pass the specific path to `ControlledField<T, N>` or `SelectField<T, N>`.

- Reuse the value preset and its schema together for CPF, phone, e-mail and birth date. `MaskedField`
  displays `mask(value)` and stores `unmask(typed)`; a CPF remains digits in the form.
- Use `SelectField` and `SearchField` for form/filter controls. Their inline-label mode is for
  toolbars: it retains an accessible name but has no hint or field-error line. Do not choose that
  mode for a field that needs inline validation feedback.
- Use `ControlledField` for another custom control; add a specialization when concrete repeated
  configuration or control behavior justifies it.
- Forward RHF's `ref` and `onBlur` to the actual focus target, and preserve the supplied
  `aria-invalid`/`aria-describedby`. A composite control without a labelable input needs
  `labelHtmlFor={false}` and an accessible name, as in `ColorField`; an `htmlFor` pointing at
  nothing does not label a radiogroup.
- Give the first appropriate field focus when fields mount after a dialog read. Preserve keyboard
  behavior supplied by the primitive: Tab navigation, Enter activation and Esc closing. For dates,
  retain the calendar's keyboard focus and return focus when clearing from the input.
- With `useFieldArray`, render array-root errors in the section because they have no individual
  input. Check the current paths after adding/removing items, not just the initial array shape.

`DateField` holds `Date | null`, keeping typed text inside the control. Empty text is `null`; incomplete
or impossible text produces an invalid `Date` so the schema refuses it rather than silently clearing
it. Numeric date order follows the browser; the calendar and date-only reads use UTC. Reuse
`BirthDateField`/`birthDateSchema` for bounds and validation. See
[date formatting](../agenza-ptbr-copy/references/formatting.md) when changing date handling.

## Apply API errors without losing recovery data

Keep these responsibilities separate:

- [formErrors.ts](../../../apps/admin-frontend/src/shared/api/formErrors.ts) matches API keys to
  current paths, normalizes indexed keys such as `guardians[1].name`, and preserves the first
  entry's message, code and metadata. Unknown paths become form-level errors.
- [applyApiProblem.ts](../../../apps/admin-frontend/src/shared/form/applyApiProblem.ts) bridges to
  RHF: it sets the code as the field error's `type`, preserves `meta`, sets `root.serverError` when
  needed and focuses the first invalid field in form order. Call it for an unsuccessful submission;
  render `FormErrorBanner` for the form-level message.
- Feature UI interprets feature-specific codes/metadata. Shared fields and the bridge do not parse
  client conflicts. In
  [ClientPersonSection](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx),
  `useFormState` observes the current CPF/e-mail error; only its matching duplicate code and
  `meta.clientId` expose the recovery link. The field error owns that lifetime, without a second
  conflict state or submitted-value copy. Build the internal route from the encoded id and reuse
  `NewTabLink`; metadata does not supply an arbitrary URL.

Display the contracted API title/field messages through the existing error components. Branch on
codes and typed metadata, never by parsing message text. Do not replace these messages with exception
or OIDC-provider descriptions. HTTP envelope details belong to the API contract workflow.

## Verify the changed behavior

Use the existing colocated component/error-bridge tests as references. Exercise the paths affected:
schema input/output, loading and saving guards, dynamic paths, error focus, preserved metadata,
stale conflict removal or keyboard interaction. Check coverage scope in the live
[Vitest configuration](../../../apps/admin-frontend/vitest.config.ts), without assuming a whole UI
directory is excluded. Commands and required gates live in
[QUALITY.md](../../../docs/QUALITY.md); dependency changes also follow the
[lockfile procedure](../../../apps/admin-frontend/README.md#lockfile).
