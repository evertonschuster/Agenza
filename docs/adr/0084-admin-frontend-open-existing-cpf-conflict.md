# ADR 0084 — admin-frontend: open the existing person from a CPF conflict

Status: accepted (2026-10-26); completes the frontend recovery path of
[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md), using the edit route of
[ADR 0077](0077-admin-frontend-client-edit.md)

The error mapping and page-owned conflict handling are superseded by [ADR 0085](0085-admin-frontend-cpf-link-from-field-error.md).
The link and its destination remain; its lifetime now follows the form field error.

## Context

The create form originally removed “Abrir cadastro existente” because its destination was a placeholder.
The owner confirmed that the action is still required and that the edit form also serves consultation in v1.
The backend already returns the matching person's id under the typed CPF field error metadata.

## Decision

The create/edit hook reads `meta.clientId` only when the problem and its `cpf` entry both have
`Client.DuplicateCpf`. The form retains the field message and focus, and shows “Abrir cadastro existente
(nova aba)” below CPF. The link builds the internal edit route from the encoded id, with `target=_blank`
and `rel=noopener noreferrer`; the metadata does not supply a URL. The original draft remains open.

Conflict state belongs to this page and is tied to the submitted CPF. Changing CPF clears it; another
submission also clears it before asking again. Missing metadata and unrelated errors show no link.
The generic error bridge and field components gain no client-specific behavior. No backend or OpenAPI change.

## Consequences

Both creation and editing now satisfy the existing-record access criterion in #139/#154/#156. This does not
introduce a separate detail screen or change the contact update contract. Component tests prove stale and absent
metadata behavior; the real-stack CPF conflict e2e opens the other tab and verifies both forms.
Specification: [`008-client-conflict-navigation`](../../apps/admin-frontend/specs/008-client-conflict-navigation/spec.md).

## Alternatives rejected

- Navigating automatically on an error loses the user's current work and assumes they want to edit the match.
- Opening in the same tab would need an additional draft preservation or discard flow.
- Adding client conflict behavior to shared form mapping would couple a generic boundary to this feature.
- Waiting for a new detail page leaves an approved recovery path absent even though editing already reads the record.
