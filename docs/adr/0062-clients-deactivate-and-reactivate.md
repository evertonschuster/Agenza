# ADR 0062 — Clients: deactivate and reactivate

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (the
situation) and [ADR 0060](0060-clients-read-by-id-contract.md) (the response)

## Context

[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) gave `Client` a `ClientStatus { Active,
Inactive }` and no transition. #157 (deactivate) and #158 (reactivate) add the two transitions as endpoints.
Three things were open: the deactivation rule needs appointments, and the appointments module (#153) does not exist
yet; what a repeated action answers; and how a status change is written without disturbing the contacts that
[ADR 0056](0056-clients-edit-replaces-contact-composition.md) makes the edit replace.

## Decision

**Endpoints.** `POST /api/v1/clients/{id}/deactivate` and `POST /api/v1/clients/{id}/reactivate`, no body. Both answer
`200` with the same `ClientResponse` as `PUT` (ADR 0060), `status` saying the new situation. An unknown id, an id of
another tenant and an id of a deleted client answer the same `404 Client.NotFound`: the two query filters do it, the
handler adds no check. An empty id is `400 Client.IdRequired`.

**Transitions.** `Client.Inactivate()` and `Client.Reactivate()` change the status and nothing else: the id, the
person's data and every contact stay. Each refuses the transition it was already in with a named error
(`Client.AlreadyInactive`, `Client.AlreadyActive`).

**Repeating the action is not an error.** Deactivating an inactive person, or reactivating an active one, answers `200`
with the current state; the handler returns before reading appointments or e-mails and before any write, so nothing
changes, not even `UpdatedAt`. This was a product choice over a `409` with the named errors; the domain still refuses
the repeated transition, the handler just never reaches it.

**Persisting a status alone.** `IClientRepository.UpdateStatusAsync` attaches the loaded client and marks the `Status`
column as modified. `UpdateAsync` cannot be used: it replaces the contact composition, which would soft-delete and
re-create every contact on a status change, and `Entry(client).State = Modified` would write every column from the
snapshot the handler loaded, overwriting an edit saved meanwhile. `ClientPersistenceTests` prove both, including the
second one against the all-columns write.

**Deactivation is blocked by upcoming appointments (#157).** The handler asks a port,
`IAppointmentRepository.ExistsNotCancelledStartingAfterAsync(clientId, instant)`, with the operation's instant
(`TimeProvider`, UTC, [ADR 0045](0045-backend-works-in-utc.md)). The rule is **strict**: an appointment blocks when its
start is after the instant. An appointment that starts exactly at the instant, one already in progress (it started in
the past) and a cancelled one never block. A blocked deactivation answers `409 Client.HasUpcomingAppointments`, in
pt-BR telling the user to resolve the appointments, and the person stays active.

**Until #153 exists the port has a provisional adapter**, `PendingAppointmentRepository`, which answers "none". That is
true today, because nothing can create an appointment, and it lets the rule and its endpoint ship now. #153 replaces the
registration in `Infrastructure/DependencyInjection.cs` with the real repository in the same change that creates the
first appointment, and deletes the adapter. What this change's unit tests prove is the handler's half: it passes the
operation's instant, it honours the answer, and a blocked or repeated call writes nothing. What they cannot prove is
the query's half (the strict start comparison and the cancelled status over real rows); those two tests belong to
#153's persistence tests.

**Reactivation is blocked by an active person's e-mail (#158).** Before the transition the handler runs
`FindActiveByEmailAsync(email, excludeClientId: self)`. A conflict answers `409 Client.DuplicateEmail`, keyed `email`,
with `clientId` and `clientName` in `meta`, the contract of ADR 0044 and
[ADR 0051](0051-camelcase-error-keys-on-the-wire.md), with a message of its own that says to fix this person's e-mail.
Another **inactive** person with the same e-mail does not block. A person with no e-mail reactivates. The e-mail is
corrected through the existing edit, which accepts an inactive person and checks the e-mail only once the person is
active.

**Concurrency.** No migration. The e-mail rule is already the partial unique index
`IX_Clients_TenantId_Email ... WHERE "Status" = 'Active' AND "DeletedAt" IS NULL`, so setting a row back to `Active`
is a write the database rejects when another active row has the e-mail. Per
[ADR 0048](0048-database-failures-are-generic-to-the-user.md) the lost race answers `409 Client.SaveFailed` and the
retry gets the specific `Client.DuplicateEmail`. Two parallel deactivations of the same person both answer `200`.

## Consequences

- Wire: two new operations on the clients resource; `services-api.d.ts` is regenerated in this change.
- The handler tests of the edit and of the read that made a client inactive by reflection now call `Inactivate()`.
- Accepted limit: between the appointment read and the save, #153 could create an appointment for the person. Nothing
  in this service's database can forbid it. #153 already has to re-check that the person is active when it saves, which
  closes the window from its side.
- The interface actions (**Desativar**, **Reativar**, the confirmation and the messages) are the frontend's and are not
  part of this change.

Verified by hand on a disposable PostgreSQL 18 with the real services and a real login, 51 checks: deactivate and
reactivate with contacts, contact rows untouched (none inserted, none soft-deleted, none stamped), repetition writing
nothing, unknown, other-tenant and deleted ids, the e-mail conflict and its `meta`, the fix-then-reactivate path,
inactive-versus-inactive, 12 parallel reactivation races (always one `200` and one `Client.SaveFailed`, never two active
rows with the e-mail), 6 parallel deactivations, and the OpenAPI document.

## Considered and rejected

- **A `409` on a repeated action.** Follows the letter of "refuse an invalid transition", but a second click or a second
  tab becomes an error for a state the user wanted.
- **`UpdateAsync` for the status.** It replaces the contacts (ADR 0056).
- **`Entry(client).State = Modified`.** Writes every column from a stale snapshot.
- **A minimal `Appointment` entity in this change.** It would decide part of #153's model (situations, names, keys) so the
  check could run against a table.
- **Delivering only #158 and waiting for #153 to do #157.** The issue sequences it that way, but it left the endpoint,
  the transition and the rule's handler half undone for no gain; the port makes the later swap one registration.
- **`>=` instead of `>` for the start.** Also defensible; the issue says "início futuro" and an appointment that starts at
  the instant of the click has started. A one-line change in the adapter #153 writes.
- **A code of its own for the reactivation e-mail conflict.** `Client.DuplicateEmail` already carries the field and the
  `meta` the interface uses to open the other person; a second code would make the interface handle two for one cause.
