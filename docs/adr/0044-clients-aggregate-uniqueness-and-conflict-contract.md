# ADR 0044 — Clients: person aggregate, uniqueness rules and conflict contract

Status: accepted (2026-10)

## Context

Issue #139 introduces the "pessoa atendida" (served person, `Client` in code, `/api/v1/clients`, the
**Pessoas** area in the UI). #154 is the first slice of that work: it creates the persisted model and the creation
contract. Query, editing, situation changes and deletion are out of its scope (#155–#159). The rules that shape
the model are stricter than anything Tags, Categories or Services needed:

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

**Situation.** The three situations of the issue map onto two mechanisms. Active and inactive are
`ClientStatus { Active, Inactive }`, stored as text with a `CHECK`; creation sets `Active` and no transition exists
yet. Deleted is **only** `BaseEntity`'s soft delete (`Remove` → `DeletedAt`): the global query filter already hides a
deleted row from every read path, and a deleted id answers 404 with no extra predicate, which is what #155 and #159
ask for. There is no `Deleted` status, so "deleted" has a single source of truth and a status that says deleted while
the row stays visible cannot exist. The e-mail index ignores a row that is either not `Active` or soft-deleted.

**Normalized storage.** The domain stores CPF as 11 digits, e-mail trimmed and lowercase, and phone trimmed, so the
unique indexes compare plain stored values (no generated column for them).

**Value objects.** `FullName`, `BirthDate`, `CpfNumber`, `EmailAddress`, `PhoneNumber` and `AdministrativeNotes` are
`record`s built through `Create`, which validates and normalizes (the `DurationRange` pattern); the optional ones
return `null` for a blank input. `Client` and its contacts receive them already valid, so the aggregate only checks
what depends on the whole: a guardian for a minor and the contact limits. `BirthDate` is the one whose rules depend on
the day they are checked ("in the past", "at most 120 years"), so `Create(value, today)` applies them to new input and
`Restore(value)` rebuilds a stored date without them; every other value object re-validates when EF reads it back.
A value object names its own errors after its type and talks about the value, not the entity using it
(`CpfNumber.Invalid`, `BirthDate.TooOld`, `ContactPurposes.Required`), each a `static readonly DomainError` on the
type, so it can be reused outside clients. The entities name theirs the same way (`Client.GuardianRequired`,
`Client.TooManyGuardians`, `ClientContact.NameRequired`…). `CreateClientCommandValidator` reuses every one of these
codes through `.WithErrorCode(...)`, so a rule answers the same code whether the validator or the domain catches it,
and the API never exposes FluentValidation's internal names (`PredicateValidator`). The use case's `ToModel` builds them
from the command. EF stores each as its plain text column through `HasConversion`, so the schema is unchanged.
Complex types were rejected because the persistence tests run on the InMemory provider, which does not support them.
The cost: a query cannot reach into `.Value` (it is not translatable through a converter); compare whole value objects
(`c.Cpf == cpf`), order by the property itself, or use `EF.Property<string>(c, "FullName")` for text matching.

**Uniqueness.**

| Rule | Index (all `UNIQUE`, tenant-scoped) |
| --- | --- |
| CPF, any situation | `IX_Clients_TenantId_Cpf` on `(TenantId, Cpf) WHERE Cpf IS NOT NULL` |
| E-mail, active persons | `IX_Clients_TenantId_Email` on `(TenantId, Email) WHERE Email IS NOT NULL AND Status = 'Active' AND DeletedAt IS NULL` |

A guardian's CPF is deliberately not constrained. The handler pre-checks both rules for the per-field answer; the
indexes are what actually guarantees uniqueness. Two creates racing past the pre-check are practically impossible for
this product, so that case gets no special handling: any failed save answers a generic `409 Client.SaveFailed`
("Não foi possível salvar a pessoa. Tente novamente."), without field errors and without claiming a duplicate. Today
the only save failure the unit of work returns as a value is a unique-index violation, but the handler does not rely on
that; a retry goes through the pre-check again and gets the specific per-field answer.

**The one `IgnoreQueryFilters()`.** `ClientRepository.FindByCpfAsync` must see soft-deleted and deleted rows, which the
global filter hides, and `IgnoreQueryFilters()` drops the tenant scope with them. The method re-applies the tenant by
hand from `ServicesDataContext.CurrentTenantId` (`Guid.Empty` — matching nothing — with no tenant). This is the only
bypass in the repository layer and is pinned by persistence tests that put the same CPF in two tenants, one of them
soft-deleted. A new read path must not copy it.

**Conflict contract.** A duplicate answers `409` with the errors keyed by field (`Cpf`, `Email`, PascalCase like
validation keys), so a form can show each under its input. `FieldError` gained an optional `Meta` string map
(omitted from the JSON when null, so no existing response changes). The CPF conflict puts `clientId` and `clientName` (so the UI can say whose record it is) there — and
only when the existing person is not deleted, since a deleted record cannot be opened; the message already tells the
user why. The e-mail conflict carries both too, always, since only active persons match it. A client reads
it from the typed OpenAPI schema (`errors.Cpf[0].meta.clientId`, `errors.Email[0].meta.clientId`).

**Validation layers.** Per-field pt-BR messages come from FluentValidation (the only place that can name the field);
the domain re-checks the same invariants and its messages are not meant to reach the user. List sizes are capped
(10 guardians, 10 reference contacts) because the issue sets no bound and an unbounded array in a body is an abuse
vector. Reference-contact purposes are strings (`emergency`, `operationalSupport`, `dailyCommunication`) validated
like `TagColor`, not a JSON enum: a bad enum value fails in the framework's binder with an English message and no code.

**"Today".** The minor rule needs a calendar day, and it is the UTC date ([ADR 0045](0045-backend-works-in-utc.md)).
Age is completed years (a leap-day birthday counts on February 28 in common years), "in the past" is strictly before
today, and "more than 120 years" means an age of 121 or more. A client that pre-validates uses the same age rule; with
its local date it is at most stricter than the backend around midnight, never looser.

**Tenant.** Neither the command nor its nested inputs has a tenant member; the tenant is assigned on save from the
validated token ([ADR 0008](0008-automatic-tenant-assignment-on-save.md)), and a `tenantId` smuggled into the body
is ignored by the binder (tested at the DTO and verified against the running API).

## Consequences

- Wire shape: camelCase English fields; `status` is `active | inactive` (a deleted person never appears in a response); dates are `yyyy-MM-dd`; CPF is
  returned as digits.
- This change is deliverable on its own: it commits the regenerated OpenAPI types
  (`apps/admin-frontend/src/shared/api/generated/services-api.d.ts`) because `generate:api-types:check` compares them
  with the live document, and it adds no consumer. The admin-frontend form is a separate change that depends on it.

Accepted costs and limits: the Postgres-only guarantees (unique indexes, composite FK, `CHECK`s, the race) have no
automated proof, per [ADR 0026](0026-remove-dedicated-runtime-tests.md). They were exercised by hand against a
disposable PostgreSQL 18 with the real services and a real login — 8 and 10 parallel creates yielded exactly one
`201` and no orphan contacts, and the schema rules were driven with SQL in a rolled-back transaction. Persistence
tests cover the EF side (tenant assignment across the graph, isolation, the filters' bypass and the index definitions).

## Considered and rejected

- **A `Deleted` value in `ClientStatus` next to the soft delete** — tried in the first version of this change and
  removed before merge: two sources of truth that every check had to read together (`IsDeleted || Status ==
  Deleted`), and a deleted status alone would not hide the row from any query.
- **One contacts table with a discriminator** — nullable columns that only apply to one kind, and a purposes column
  that is meaningless for guardians.
- **Named query filters / changing `ApplyAuditableConventions` to split tenant from soft delete** — would remove the
  hand-written tenant predicate, but touches the highest-consequence mechanism ([ADR 0006](0006-tenant-header-base-entity-generic-repository.md))
  for one lookup.
- **The existing id as a top-level problem extension** — not visible in the generated OpenAPI schema, so untyped.
- **Sending the user to a CPF search instead of the record** — an extra step, and no such search exists yet.
- **JSON enums for purposes and status** — see the validation note above.
- **Brazil's business day (`America/Sao_Paulo`) for "today"** — implemented and reverted before merge; see
  [ADR 0045](0045-backend-works-in-utc.md).
