# ADR 0062 — Clients: deactivate and reactivate

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (the
situation) and [ADR 0060](0060-clients-read-by-id-contract.md) (the response)

## Context

[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) gave `Client` a `ClientStatus { Active,
Inactive }` and no transition. #157 (deactivate) and #158 (reactivate) add the two transitions as endpoints.
Three things were open: the deactivation rule needs appointments, and the appointments module (#153) does not exist
yet; what a repeated action answers; and how a status change is saved through the same `UpdateAsync` as the edit,
whose contacts [ADR 0056](0056-clients-edit-replaces-contact-composition.md) makes it replace.

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

**A status change is saved with `UpdateAsync`, like the edit.** There is no second repository method for it.
`UpdateAsync` used to remove every stored contact and add every contact of the aggregate, which is right for the edit
(it mints new contact ids) and throws for an aggregate whose contacts did not change: the loaded contacts are added
under ids that were just marked for removal. It now compares by id and stages only the difference: it removes the stored
contacts the aggregate no longer holds and adds the ones the database does not have. The edit still replaces
everything, since every contact it builds is new; a status change touches no contact row. The root is saved whole, so a
status change writes every column from the snapshot the handler loaded, the same exposure to a simultaneous edit that
the `PUT` already has and that this product accepts for a client record.

**Deactivation is blocked by upcoming appointments (#157).** The handler asks a port,
`IAppointmentRepository.HasUpcomingAppointmentsAsync(clientId)`, and the adapter decides what "upcoming" means with
`TimeProvider` in UTC ([ADR 0045](0045-backend-works-in-utc.md)), so the port carries no instant. The rule is
**strict**: an appointment is upcoming when its start (the start of the service, not of the preparation) is after the
instant the query runs, and it is not cancelled. An appointment that starts exactly at that instant, one already in
progress (it started in the past) and a cancelled one never block. A blocked deactivation answers
`409 Client.HasUpcomingAppointments`, in pt-BR telling the user to resolve the appointments, and the person stays
active.

**Until #153 exists the port has a provisional adapter**, `PendingAppointmentRepository`, which answers "none". That is
true today, because nothing can create an appointment, and it lets the rule and its endpoint ship now. #153 replaces the
registration in `Infrastructure/DependencyInjection.cs` with the real repository, which reads the clock and applies the
rule above, in the same change that creates the first appointment, and deletes the adapter. What this change's unit
tests prove is the handler's half: it asks once, it honours the answer, and a blocked or repeated call writes nothing.
What they cannot prove is the query's half (the strict start comparison and the cancelled status over real rows, with a
fixed clock); those tests belong to #153's persistence tests.

**Reactivation is blocked by an active person's e-mail (#158).** Before the transition the handler runs
`FindActiveByEmailAsync(email, excludeClientId: self)`. A conflict answers `409 Client.DuplicateEmail`, keyed `email`,
with `clientId` and `clientName` in `meta`, the contract of ADR 0044 and
[ADR 0051](0051-camelcase-error-keys-on-the-wire.md), with a message of its own that says to fix this person's e-mail.
Another **inactive** person with the same e-mail does not block. A person with no e-mail reactivates. The e-mail is
corrected through the existing edit, which accepts an inactive person and checks the e-mail only once the person is
active.

**Reactivation also checks the CPF, defensively.** The CPF index covers active and inactive people alike and
reactivating changes neither the CPF nor the deletion, so the database cannot produce a CPF conflict here and the
normal flow never reaches the check. It is kept because the create and the edit run the same pre-check and a person whose
data was changed outside the application should not be reactivated into a duplicate. It runs first, with
`FindByCpfAsync(cpf, excludeClientId: self)`, one conflict per answer as in ADR 0044, and answers
`409 Client.DuplicateCpf`, keyed `cpf`, with the same `meta` and a message of its own that says to fix this person's CPF.

**A failed save is logged by the unit of work.** `UnitOfWork` writes the `Warning` with the kind and the
constraint name once for every save the database rejects; the four clients handlers (create, edit, deactivate,
reactivate) no longer take an `ILogger` and only answer `409 Client.SaveFailed`
([ADR 0048](0048-database-failures-are-generic-to-the-user.md)). Tags, Categories and Services keep their persistence
error mappers, which log a constraint they do not recognise; for that one case the same failed save appears twice in the
log until those slices are converted.

**Concurrency.** No migration. The e-mail rule is already the partial unique index
`IX_Clients_TenantId_Email ... WHERE "Status" = 'Active' AND "DeletedAt" IS NULL`, so setting a row back to `Active`
is a write the database rejects when another active row has the e-mail. Per
[ADR 0048](0048-database-failures-are-generic-to-the-user.md) the lost race answers `409 Client.SaveFailed` and the
retry gets the specific `Client.DuplicateEmail`. Two parallel deactivations of the same person both answer `200`.

## Consequences

- Wire: two new operations on the clients resource; `services-api.d.ts` is regenerated in this change.
- The handler tests of the edit and of the read that made a client inactive by reflection now call `Inactivate()`.
- `UnitOfWorkTests` cover the log: a unique violation returns the failure and logs one warning, a success logs nothing,
  and another database failure propagates without a log.
- Entity Framework Core also logs each rejected command at `Error` on its own, as it already did for the create and the
  edit races; that line is not ours.
- Accepted limit: between the appointment read and the save, #153 could create an appointment for the person. Nothing
  in this service's database can forbid it. #153 already has to re-check that the person is active when it saves, which
  closes the window from its side.
- The interface actions (**Desativar**, **Reativar**, the confirmation and the messages) are the frontend's and are not
  part of this change.

Verified by hand on a disposable PostgreSQL 18 with the real services and a real login, 55 checks: deactivate and
reactivate with contacts, contact rows untouched (none inserted, none soft-deleted, none stamped), a person with a CPF
going round trip, repetition writing nothing, unknown, other-tenant and deleted ids, the e-mail conflict and its `meta`,
the fix-then-reactivate path with the `PUT` still replacing the contacts, inactive-versus-inactive, 12 parallel
reactivation races (always one `200` and one conflict, `Client.SaveFailed` or, when the race was not lost,
`Client.DuplicateEmail`, never two active rows with the e-mail), 6 parallel deactivations, and the OpenAPI document.
The service log carried one `UnitOfWork` warning per lost race and no handler message.

## Considered and rejected

- **A `409` on a repeated action.** Follows the letter of "refuse an invalid transition", but a second click or a second
  tab becomes an error for a state the user wanted.
- **`UpdateStatusAsync`, a second repository method that writes only the `Status` column** (the first version of
  this change). `UpdateAsync` threw for unchanged contacts, so it was built to avoid that and to keep a simultaneous
  edit; changed after review, because a client record has no need for the optimisation and one way to update the
  aggregate is simpler. `UpdateAsync` was fixed instead.
- **`UpdateAsync` as it was.** It throws when the contacts did not change.
- **Rewriting the contacts on a status change** (calling the edit with the same data). It soft-deletes and re-creates
  every contact row to change one column.
- **The log in each handler** (the first version). Four copies of the same `if`; moved to `UnitOfWork` after review.
- **No CPF check on reactivation.** Right in theory, since the index makes a conflict impossible, but it left this
  handler different from the create and the edit; added after review.
- **A minimal `Appointment` entity in this change.** It would decide part of #153's model (situations, names, keys) so the
  check could run against a table.
- **Delivering only #158 and waiting for #153 to do #157.** The issue sequences it that way, but it left the endpoint,
  the transition and the rule's handler half undone for no gain; the port makes the later swap one registration.
- **`>=` instead of `>` for the start.** Also defensible; the issue says "início futuro" and an appointment that starts at
  the instant of the click has started. A one-line change in the adapter #153 writes.
- **An instant parameter on the port** (`ExistsNotCancelledStartingAfterAsync(clientId, instant)`, the first version of
  this change). It kept the clock in the handler, but put a `DateTimeOffset` and a three-condition name on a question
  the handler only needs answered as yes or no; changed after review.
- **A code of its own for the reactivation e-mail conflict.** `Client.DuplicateEmail` already carries the field and the
  `meta` the interface uses to open the other person; a second code would make the interface handle two for one cause.
