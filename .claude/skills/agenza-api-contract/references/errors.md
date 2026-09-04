# Error taxonomy, the Problem shape, and field errors in a form

Read [`SKILL.md`](../SKILL.md) first. This file is only for when the task actually handles a failure.

## The wire shape

One type for every failure, on every endpoint:
`backend/shared/Admin.SharedKernel.AspNetCore/ApiProblemDetails.cs`, surfacing in the frontend as
`components['schemas']['ApiProblemDetails']`, re-exported by `servicesFacade.ts` as `ApiProblem`.
It is RFC 7807 (`type`, `title`, `status`, `detail`, `instance`) plus four Agenza fields: `code`,
`traceId`, `correlationId`, `errors`.

**Every field is optional and nullable in the generated type.** The facade's `isProblem` guard only
requires `title` to be a string, so a branch that reads `code` must tolerate `null`. Render a
fallback rather than an empty string.

`traceId` / `correlationId` are for `shared/logger.ts` and a support surface — not body copy.

## Who produces which status

Backend mapping lives in `ResultExtensions.ToHttpStatusCode` and `ApiProblemDetailsFactory`:

| Origin | Status | `code` |
| --- | --- | --- |
| `ErrorType.Validation` (FluentValidation, via `Dispatcher`) | 400 | `Validation.Failed` |
| `ErrorType.Failure` | 400 | handler's own, e.g. `Owner.CreationFailed` |
| `ErrorType.Forbidden` | 403 | handler's own |
| `ErrorType.NotFound` | 404 | `<Aggregate>.NotFound` |
| `ErrorType.Conflict` | 409 | `<Aggregate>.DuplicateName`, … |
| authorization middleware | 401 / 403 | `Authorization.Unauthorized` / `Authorization.Forbidden` |
| `GenericExceptionHandler` | 500 | `Unexpected.Error` |

Codes are `<Aggregate>.<Reason>` in English and stable; `title` is pt-BR prose written for the user
and is **not** stable. Branch on `code`, display `title`.

A real 500 still arrives as a Problem body, so it becomes `fail(problem)` with `Unexpected.Error` —
**not** `SERVER_PROBLEM`. `SERVER_PROBLEM` means a non-2xx whose body was not a Problem at all
(a proxy or gateway page, an empty error), i.e. something answered that was not the service.

## The three synthetic problems

Exported from `servicesFacade.ts`, all `status: 0`:

| Constant | Raised when | UI |
| --- | --- | --- |
| `SESSION_PROBLEM` | `MissingSessionError` — no token or tenant at request time | send to login; same destination as a real `Authorization.Unauthorized` |
| `NETWORK_PROBLEM` | the fetch itself threw (offline, DNS, connection refused) | retry affordance |
| `SERVER_PROBLEM` | non-2xx with no Problem body | retry affordance, and log it |

`SESSION_PROBLEM` exists separately from `NETWORK_PROBLEM` for one reason: an expired session must
not read as "sem conexão", because the user's actual next step is entirely different.

## `errors` is not always field errors

This is the trap. `errors` is `Record<string, { code?, message? }[]>` and gets filled **two
different ways** (`ApiProblemDetailsFactory`):

1. **Validation (400).** Keys come from FluentValidation's `PropertyName`, grouped in
   `Dispatcher.cs` — so they are **PascalCase C# property names** (`Name`, `DurationMinutes`), not
   the camelCase your JSON body and form fields use. A cross-field rule can be re-keyed onto one
   field with `OverridePropertyName` (see `CreateServiceCommandValidator.cs`), so the key set is not
   mechanically the command's properties either.
2. **Any other application error** (Conflict, NotFound, Failure). `CreateSingleErrorDictionary`
   puts the error itself under the **empty-string key `""`**. So a 409 arrives with a populated
   `errors` that maps to no field at all.

Authorization and unexpected problems carry an empty `errors` object, never `null` in practice —
but the type says nullable, so guard anyway.

A form that iterates `errors` and matches keys to inputs will therefore **silently drop** every
409 and every cross-field message. Unmatched keys must fall back to a form-level message.

## Mapping to a form

Case-insensitive lookup against the form's own field names, unmatched keys promoted to form level:

```ts
import type { ApiProblem } from '@/shared/api/servicesFacade';

export function toFormErrors(problem: ApiProblem, fields: readonly string[]) {
  const byField = new Map(fields.map((field) => [field.toLowerCase(), field]));
  const perField: Record<string, string[]> = {};
  const formLevel: string[] = [];

  for (const [key, entries] of Object.entries(problem.errors ?? {})) {
    const messages = entries.flatMap((entry) => (entry.message ? [entry.message] : []));
    const field = byField.get(key.toLowerCase());
    if (field) (perField[field] ??= []).push(...messages);
    else formLevel.push(...messages);
  }

  if (formLevel.length === 0 && Object.keys(perField).length === 0 && problem.title) {
    formLevel.push(problem.title);
  }
  return { perField, formLevel };
}
```

The live example belongs next to the first form that needs it — put it in that slice's `model/`,
where it is testable with a Problem fixture and no mocks, not in `shared/`. Promote it to `shared/`
only when a second form needs the same thing.

Rendering rules that belong with it: field messages go on the input via `aria-describedby` and
`aria-invalid`; the form-level list goes in a live region above the submit button so a screen reader
announces it after a failed submit. Messages are already pt-BR — display them, never rewrite them.

## Branching, in shape

```ts
const result = await serviceRepository.create(command);
if (result.ok) return redirect(`/servicos/${result.data.id}`);

switch (result.error.code) {
  case 'Validation.Failed':
    return toFormErrors(result.error, FIELDS);
  case 'Service.DuplicateName':
    return { formLevel: [result.error.title ?? 'Não foi possível salvar.'] };
  case 'Session.Missing':
  case 'Authorization.Unauthorized':
    return redirect('/login');
  default:
    return { formLevel: [result.error.title ?? 'Não foi possível salvar.'] };
}
```

Note what is absent: no `try/catch` (the call cannot reject), no `unwrapOrThrow` (this is an
`action`, so the `Result` stays a value), and no reading of `detail` or `title` to decide anything.
