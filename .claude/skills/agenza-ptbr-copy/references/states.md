# Failure and screen states

## Explain a failure and provide a way forward

Name what did not happen and offer a recovery the screen actually supports. Reuse the existing
problem component so its stable code remains available for support. A retry instruction needs a
working retry action; “contacte o administrador” alone does not help. When support is the only
option, say which code/time to include and never request a password.

The live message boundary is
[servicesFacade.ts](../../../../apps/admin-frontend/src/shared/api/servicesFacade.ts),
[formErrors.ts](../../../../apps/admin-frontend/src/shared/api/formErrors.ts) and
[applyApiProblem.ts](../../../../apps/admin-frontend/src/shared/form/applyApiProblem.ts).
The facade supplies curated fallback problems. For non-2xx responses other than 429, its current
`isProblem` guard accepts any non-null object with a string `title`; it does not validate the
problem's full schema, origin or suitability for display. A title alone is not evidence that a
message belongs to the service's user-facing contract. Some valid API problems have only a title,
so requiring a code would also reject supported responses.

The copy guidance here applies to the service's contracted user-facing messages and the local
fallbacks. It is not a guarantee enforced by the current guard. Form mapping preserves field
messages and uses the first unmatched message for the form; the title is a fallback when errors
supply no usable message. Screens branch on codes/typed metadata, never on wording. Do not add
exception text, OIDC-provider descriptions, `detail`, `type` or diagnostic ids as explanatory copy.
Changes to response validation belong at the shared API boundary, not in per-page text filters.

| Surface                         | Existing path                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------- |
| A list region fails             | The list's error state through `ListSection`, with its retry                    |
| A confirmation action fails     | `ConfirmDialog`'s failure view and recovery                                     |
| Submission validation fails     | `applyApiProblem(problem, methods)` and `FormErrorBanner`                       |
| A mutation needs an error toast | `toast.serverError(screenTitle, problem)`; the description uses `problem.title` |

Keep local schema messages specific to the field. Server-only validation, such as uniqueness, uses
the mapped API field message. Do not show two competing messages for one field or turn expected
validation into a full-screen failure. Preserve metadata used by the feature's recovery UI.

## Distinguish empty, loading and failed

| Situation                     | Copy and recovery                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Nothing has been created      | “Nenhum serviço ainda”, a brief explanation and the creation action                                            |
| Applied filters match nothing | Explain the absence of matches and offer Limpar busca/filtros                                                  |
| Data did not load             | Explain the failure and show recovery; never report that no records exist                                      |
| Data is loading               | Use the existing skeleton and `aria-busy`; if text is needed, name the content, such as “Carregando serviços…” |

Use the actual filters and current loading state; do not infer emptiness from an absent response.
For a destination that is not available, explain what it will do and give a working way back. Do
not promise a date or render fake rows/actions as if the feature worked.

## Confirmation and success

Describe the record and the real consequence of the operation. Verify whether deletion is soft,
recoverable or blocked by related data before promising anything in copy. The confirmation button
repeats the action verb, such as Excluir, rather than “Sim” or “OK”.

Follow the screen's existing success feedback and avoid adding duplicate notifications. Keep a
routine success short and specific, such as “Pessoa cadastrada” or “Etiqueta atualizada”. Check the
same verb, accessible label and recovery path across success and failure states.
