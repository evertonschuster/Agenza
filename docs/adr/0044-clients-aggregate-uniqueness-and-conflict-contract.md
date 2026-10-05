# ADR 0044 — Clients: person aggregate, uniqueness rules and conflict contract

Status: accepted (2026-10)

## Context

Issue #139 introduces the "pessoa atendida" (served person, `Client` in code, `/api/v1/clients`, the
**Pessoas** area in the UI). #154 is the first slice of that work: it creates the persisted model and the
contract that #155 (query), #156 (update), #157 (deactivate), #158 (reactivate) and #159 (delete) build on.
The rules that shape the model are stricter than anything Tags, Categories or Services needed:

- CPF is unique per tenant across **every** situation — active, inactive and deleted — and must never be
  reused; e-mail is unique only among **active** persons of the tenant. Both must hold under concurrent
  writes ([ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md) already says the database,
  not a pre-check, is the final authority).
- A person owns two kinds of linked contacts (guardians and reference contacts) that are not persons
  themselves, and the person and its contacts must be written atomically.
- A birth date that indicates a minor requires a guardian, on the backend and in the form.
- A CPF conflict must let the user open the existing record, so the error has to carry that record's id.

## Decision

**Aggregate.** `Client` is a `TenantOwnedEntity` root; `ClientGuardian` and `ClientReferenceContact` are tenant-owned
children (`ClientContact` is an unmapped abstract base for the shared name/relationship/phone). Two tables, not one
with a discriminator: the two contact kinds have different required data (guardian CPF vs. purposes) and the issue
insists they are separate records. Children reference the root through the composite key
`(TenantId, ClientId) → Clients(TenantId, Id)` ([ADR 0024](0024-database-enforced-data-ownership.md)). One
`SaveChanges` is one transaction, so a failure leaves no partial person.

**Situation.** `ClientStatus { Active, Inactive, Deleted }`, stored as text with a `CHECK`. Creation sets `Active`;
the transitions belong to #157–#159. A person that becomes `Deleted` must **also** be soft-deleted through the
existing `BaseEntity` mechanism (`Remove` → `DeletedAt`), because the global query filter is what makes a deleted
record invisible — and answer 404 — in every read path by default. The e-mail index ignores a row that is either
not `Active` or soft-deleted, so it stays correct whichever of the two a future operation sets.

**Normalized storage.** The domain stores CPF as 11 digits, e-mail trimmed and lowercase, and phone trimmed, so the
unique indexes compare plain stored values (no generated column for them). `FullNameNormalized` (`lower("FullName")`,
the convention of ADR 0012) exists for #155's stable ordering.

**Uniqueness.**

| Rule | Index (all `UNIQUE`, tenant-scoped) |
| --- | --- |
| CPF, any situation | `IX_Clients_TenantId_Cpf` on `(TenantId, Cpf) WHERE Cpf IS NOT NULL` |
| E-mail, active persons | `IX_Clients_TenantId_Email` on `(TenantId, Email) WHERE Email IS NOT NULL AND Status = 'Active' AND DeletedAt IS NULL` |

A guardian's CPF is deliberately not constrained. The handler pre-checks both rules for a friendly answer; the
indexes decide races, and `UnitOfWork` already turns SQLSTATE `23505` into a `PersistenceError` carrying the
constraint name.

**The one `IgnoreQueryFilters()`.** `ClientRepository.FindByCpfAsync` must see soft-deleted and deleted rows, which the
global filter hides, and `IgnoreQueryFilters()` drops the tenant scope with them. The method re-applies the tenant by
hand from `ServicesDataContext.CurrentTenantId` (`Guid.Empty` — matching nothing — with no tenant). This is the only
bypass in the repository layer and is pinned by persistence tests that put the same CPF in two tenants, one of them
soft-deleted. A new read path must not copy it.

**Conflict contract.** A duplicate answers `409` with the errors keyed by field (`Cpf`, `Email`, PascalCase like
validation keys), so a form can show each under its input. `FieldError` gained an optional `Meta` string map
(omitted from the JSON when null, so no existing response changes). The CPF conflict puts `clientId` there — and
only when the existing person is not deleted, since a deleted record cannot be opened; the message already tells the
user why. A client reads it from the typed OpenAPI schema (`errors.Cpf[0].meta.clientId`); the id is the one
`GET /api/v1/clients/{id}` will serve once #155 lands.

**Validation layers.** Per-field pt-BR messages come from FluentValidation (the only place that can name the field);
the domain re-checks the same invariants and its messages are not meant to reach the user. List sizes are capped
(10 guardians, 10 reference contacts) because the issue sets no bound and an unbounded array in a body is an abuse
vector. Reference-contact purposes are strings (`emergency`, `operationalSupport`, `dailyCommunication`) validated
like `TagColor`, not a JSON enum: a bad enum value fails in the framework's binder with an English message and no code.

**"Today".** The minor rule needs a calendar day, so `TimeProvider.GetBusinessToday()` converts to
`America/Sao_Paulo` (Windows id, then a fixed UTC−3, because Brazil has had no DST since 2019). Age is completed years
(a leap-day birthday counts on February 28 in common years), "in the past" is strictly before today, and "more than
120 years" means an age of 121 or more. A client that pre-validates must use the same day and the same age rule.

**Tenant.** Neither the command nor its nested inputs has a tenant member; the tenant is assigned on save from the
validated token ([ADR 0008](0008-automatic-tenant-assignment-on-save.md)), and a `tenantId` smuggled into the body
is ignored by the binder (tested at the DTO and verified against the running API).

## Consequences

What #155–#159 can rely on:

- Read paths go through `ServicesDataContext`'s filter: deleted persons never appear and unknown ids answer 404 with no
  extra predicate. Only the CPF lookup bypasses it.
- Wire shape: camelCase English fields; `status` is `active | inactive | deleted`; dates are `yyyy-MM-dd`; CPF is
  returned as digits (masking lists is #155's job).
- Deleting must go through `Remove` (soft delete) **and** set `Status = Deleted`; reactivating must re-check the e-mail
  rule with `ActiveEmailExistsAsync` (it will need an exclusion for the person itself, which Create does not).
- `Client.Create`/`ClientGuardian.Create` are the factories to extend with `Update` for #156; the contact-id rules
  are theirs to add.
- This change is deliverable on its own: it commits the regenerated OpenAPI types
  (`apps/admin-frontend/src/shared/api/generated/services-api.d.ts`) because `generate:api-types:check` compares them
  with the live document, and it adds no consumer. The admin-frontend form is a separate change that depends on it.

Accepted costs and limits: the Postgres-only guarantees (unique indexes, composite FK, `CHECK`s, the race) have no
automated proof, per [ADR 0026](0026-remove-dedicated-runtime-tests.md). They were exercised by hand against a
disposable PostgreSQL 18 with the real services and a real login — 8 and 10 parallel creates yielded exactly one
`201` and no orphan contacts, and the schema rules were driven with SQL in a rolled-back transaction. Persistence
tests cover the EF side (tenant assignment across the graph, isolation, the filters' bypass and the index definitions).

## Considered and rejected

- **One contacts table with a discriminator** — nullable columns that only apply to one kind, and a purposes column
  that is meaningless for guardians.
- **Deletion as a status only (no `DeletedAt`)** — every read path would need its own `Status <> Deleted` predicate;
  one forgotten predicate exposes deleted people. The soft-delete filter is already the default everywhere.
- **Named query filters / changing `ApplyAuditableConventions` to split tenant from soft delete** — would remove the
  hand-written tenant predicate, but touches the highest-consequence mechanism ([ADR 0006](0006-tenant-header-base-entity-generic-repository.md))
  for one lookup.
- **The existing id as a top-level problem extension** — not visible in the generated OpenAPI schema, so untyped.
- **Sending the user to a CPF search instead of the record** — an extra step, and it depends on #155's search.
- **JSON enums for purposes and status** — see the validation note above.
