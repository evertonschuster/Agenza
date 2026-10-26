# ADR 0085 — admin-frontend: the CPF link follows its form field error

Status: accepted (2026-10-26); supersedes the error mapping and conflict-handling portion of
[ADR 0084](0084-admin-frontend-open-existing-cpf-conflict.md)

The owner requested that `ClientPersonSection` observe the CPF error directly. Keeping the submitted CPF,
an extra state, a value subscription and props through the page duplicated the form's error lifetime.

`toFormErrors` preserves the first field entry's message, code and metadata. The generic RHF bridge keeps
the code as the error type and preserves its metadata, without interpreting client-specific keys.
`ClientPersonSection` subscribes to the `cpf` error with `useFormState` and renders the existing link
when its type is `Client.DuplicateCpf` and `meta.clientId` is present. Native revalidation, clearing and
replacement of that error control the link. The page hook has no CPF-conflict state or parsing.

The new-tab destination and draft preservation remain as in ADR 0084. No backend or generated API change.
The page-owned state was implemented, tested and then removed after this review; it is not a pattern to copy.
