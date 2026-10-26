# ADR 0080 — Clients: delete

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (the
situation and uniqueness) and [ADR 0062](0062-clients-deactivate-and-reactivate.md) (the appointments port)

## Context

#159 deletes a client. [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) already settled what
"deleted" is: `BaseEntity`'s soft delete and nothing else, with no `Deleted` status, and a deletion frees the CPF and
the e-mail. The issue texts of #139, #154 and #159 still said a deleted person's CPF stays reserved; they were corrected
on 2026-10-25 to follow ADR 0044. Four things were open: the rule needs appointments, and the appointments module (#153)
does not exist yet; what the deletion writes on the contacts; what a repeated deletion answers; and what the endpoint
returns.

## Decision

**Endpoint.** `DELETE /api/v1/clients/{id}`, no body, answering `204` like the other deletes of the service. An empty id
is `400 Client.IdRequired`. An unknown id, an id of another tenant and an id already deleted answer the same
`404 Client.NotFound`: the two query filters do it, the handler adds no check. A blocked deletion is
`409 Client.HasAppointments`, and a save the database rejects is `409 Client.SaveFailed`
([ADR 0048](0048-database-failures-are-generic-to-the-user.md)).

**Deleting is the repository's `Remove`, whatever the status.** An active and an inactive person are deleted the same
way: the handler loads the client, runs the pre-check, calls `Remove` and saves, and the save interceptor turns the
deletion into `DeletedAt` and `DeletedBy`. `IClientRepository` gains `Remove`, which `RepositoryBase` already
implements. There is no domain method: the aggregate has no rule of its own about being deleted (every client it can
load is active or inactive), and ARCHITECTURE §3 makes a deletion a repository `Remove`.

**The contacts are soft-deleted with the person.** `GetByIdAsync` loads the client with its live contacts; `Remove`
attaches that graph, EF cascades the deletion to the contacts it holds, and the interceptor turns every row into an
`UPDATE` with the same `DeletedAt` and `DeletedBy`. No row leaves the table. The contacts that were current when the
person was deleted are the ones whose `DeletedAt` equals the person's; a contact an earlier edit replaced keeps the
`DeletedAt` of that edit, because `GetByIdAsync` never loads it. This was a product choice over stamping the person
alone.

**A repeated deletion answers `404`.** After the first deletion the soft-delete filter hides the row, so a second call
is `Client.NotFound` and writes nothing. This differs from the repeated deactivation of ADR 0062, which answers `200`
with the current state: a deleted person has no state the API may show, and the issue asks that an id already deleted
expose nothing and produce no new deletion.

**The CPF and the e-mail are freed.** ADR 0044 stands: both unique indexes filter `"DeletedAt" IS NULL`, and
`FindByCpfAsync` and `FindActiveByEmailAsync` read through the filters, so a new registration with the same CPF or
e-mail passes and gets a new id. The deleted id is never reused. No migration.

**Any appointment blocks.** After the `NotFound` and before `Remove`, the handler asks a port,
`IAppointmentRepository.HasAppointmentsAsync(clientId)`: does the person have any appointment, in any situation
(scheduled, executed, cancelled) and at any time, past or future? Yes answers `409 Client.HasAppointments` with a pt-BR
message that suggests deactivating instead, and nothing is written. Appointments are read, never changed.

**Until #153 exists the port's provisional adapter answers "none"**, as it does for
`HasUpcomingAppointmentsAsync` and for the same reason (ADR 0062): no appointment can exist yet, so the answer is true
today. The repository #153 registers in its place implements both methods, which the interface enforces, and its
persistence tests prove the query's half over real rows: a past, a future, a cancelled and an executed appointment each
block. What this change's unit tests prove is the handler's half: it asks once, after the client is found, and a
blocked call writes nothing.

**The confirmation belongs to the interface.** The `DELETE` is already the explicit act, so the endpoint takes no
confirmation flag.

## Consequences

- Wire: one new operation on the clients resource; `services-api.d.ts` is regenerated in this change.
- ARCHITECTURE §10's "Delete" row points to `DeleteClientCommandHandler.cs`; the tags and categories deletes become the
  older shape.
- `docs/API.md` is unchanged: no shape shared by every endpoint changed, and its delete rule (`204 No Content`) already
  covers this one.
- Accepted limit, as in ADR 0062: between the appointment read and the save, #153 could create an appointment for the
  person. #153 already has to re-check, when it saves, that the person exists and is active, and a deleted person fails
  that read, which closes the window from its side.
- The interface action (**Excluir**, its confirmation, removing the person from the list and the messages) is the
  frontend's and is not part of this change.

Verified by hand on a disposable PostgreSQL 18 with the real services and a real login, 42 checks: `204` with no body
for an active and an inactive person; the person's row and its three contact rows kept, each contact with the person's
`DeletedAt`; a contact an earlier edit replaced keeping the `DeletedAt` of that edit; a second call answering `404` and
writing nothing; `GET`, `PUT`, deactivate and reactivate of a deleted id answering `404`; the list (`all`, `active`,
`inactive`) and the search by name and by CPF leaving it out; a new person with the same CPF and e-mail answering `201`
with another id; the same `404` body for an unknown, another tenant's (its row untouched) and a deleted id;
`400 Client.IdRequired`, `401` without a token and `403 Tenant.ContextMismatch`; six parallel deletions answering only
`204` or `404`, the row deleted once; and the OpenAPI document. `409 Client.HasAppointments` can only be reached once
#153 can create an appointment.

The same run showed `CreatedBy`, `UpdatedBy` and `DeletedBy` empty on every row of the service: the bearer handler maps
the token's `sub` to the name-identifier claim, and `HttpContextCurrentUserAccessor` looks for `sub`. That predates this
change and is fixed by [ADR 0081](0081-bearer-keeps-token-claim-names.md), after which a deletion records its actor with
nothing changed here.

## Considered and rejected

- **Stamping the person alone, leaving the contacts untouched.** The contacts current at deletion would stay the ones
  with no `DeletedAt`, and a deletion would write one row; it needs a `Remove` that marks only the root, since EF
  cascades by default. Turned down by product choice.
- **Keeping a deleted person's CPF reserved.** The issues' first wording, rejected again: a migration on the CPF index,
  a lookup that sees deleted rows ([ADR 0046](0046-separate-soft-delete-and-tenant-query-filters.md) would need its
  helper), a conflict that points to a record which answers `404`, and a CPF blocked for good, since nothing restores a
  deleted person.
- **Waiting for #153 before delivering the endpoint.** The issue sequences it that way; ADR 0062 turned down the same
  wait for the deactivation, and the port makes the later swap one registration.
- **A `200` with the deleted client, or a `204` again on a repeated call.** The first shows data of a person the API no
  longer exposes; the second needs a read that sees deleted rows.
- **A `Deleted` status or a `Client.Delete()` method.** ADR 0044 and ARCHITECTURE §3.
- **A confirmation flag on the endpoint.** Any client able to call `DELETE` can send it; it proves nothing the verb does
  not.
