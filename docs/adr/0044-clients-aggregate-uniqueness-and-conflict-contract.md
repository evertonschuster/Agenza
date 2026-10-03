# ADR 0044 — Clients: person aggregate, uniqueness rules and conflict contract

Status: accepted (2026-10)

## Context

Issue #139 introduces the "pessoa atendida" (served person, `Client` in code, `/api/v1/clients`, the
**Pessoas** area in the UI). #154 is the first slice of that work: it creates the persisted model and the creation
contract. Query, editing, situation changes and deletion are out of its scope (#155–#159). The rules that shape
the model are stricter than anything Tags, Categories or Services needed:

- CPF is unique per tenant among persons that are not deleted, active or inactive: deleting a person frees the CPF for
  a new registration, inactivating does not. E-mail is unique only among **active** persons of the tenant. Both must
  hold under concurrent writes ([ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md) already says
  the database, not a pre-check, is the final authority).
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

Only the root creates its children: `Client.Create` receives the contacts as data (`GuardianData`,
`ReferenceContactData`, records carrying the value objects) and builds each child through an `internal` factory that
already gets the client's id, so nothing outside the domain can create a contact or move one to another person. The
context has no `DbSet` for the children; they are read and written through `Clients`. Editing contacts (#156) goes
through the root as well: one operation that synchronizes the lists by id and re-checks the guardian and limit rules on
the result.

**Situation.** The three situations of the issue map onto two mechanisms. Active and inactive are
`ClientStatus { Active, Inactive }`, stored as text with a `CHECK`; creation sets `Active` and no transition exists
yet. Deleted is **only** `BaseEntity`'s soft delete (`Remove` → `DeletedAt`): the global query filter already hides a
deleted row from every read path, and a deleted id answers 404 with no extra predicate, which is what #155 and #159
ask for. There is no `Deleted` status, so "deleted" has a single source of truth and a status that says deleted while
the row stays visible cannot exist. Both unique indexes ignore a soft-deleted row; the e-mail one also ignores a row
that is not `Active`.

**Normalized storage.** The domain stores CPF as 11 digits, e-mail trimmed and lowercase, and phone trimmed, so the
unique indexes compare plain stored values (no generated column for them).

**Value objects.** `FullName`, `BirthDate`, `CpfNumber`, `EmailAddress`, `PhoneNumber`, `AdministrativeNotes` and
`ContactPurposes` are `record`s built through `Create`, which validates and normalizes (the `DurationRange` pattern); the optional ones
return `null` for a blank input. `Client` and its contacts receive them already valid, so the aggregate only checks
what depends on the whole: a guardian for a minor and the contact limits. `Create` is for new input; `Restore(value)`
rebuilds a stored value without re-validating it and is what EF's conversions call, so a row stays readable after a rule
changes or after data is fixed outside the application (`TagColor` follows the same split). `BirthDate.Create` also takes
`today`, because its rules depend on the day they are checked ("in the past", "at most 120 years").
A value object names its own errors after its type and talks about the value, not the entity using it
(`CpfNumber.Invalid`, `BirthDate.TooOld`, `ContactPurposes.Required`), each a `static readonly DomainError` on the
type, so it can be reused outside clients. The entities name theirs the same way (`Client.GuardianRequired`,
`Client.TooManyGuardians`, `ClientContact.NameRequired`…). `CreateClientCommandValidator` runs these same functions and
only names the field ([ADR 0047](0047-validation-rules-live-in-the-domain.md)), so a rule answers the same code and
message whichever layer catches it, and the API never exposes FluentValidation's internal names (`PredicateValidator`).
The use case's `ToModel` builds them
from the command. EF stores each as its plain text column through `HasConversion`, so the schema is unchanged.
Complex types were rejected because the persistence tests run on the InMemory provider, which does not support them.
The cost: a query cannot reach into `.Value` (it is not translatable through a converter); compare whole value objects
(`c.Cpf == cpf`), order by the property itself, or use `EF.Property<string>(c, "FullName")` for text matching.

**Uniqueness.**

| Rule | Index (all `UNIQUE`, tenant-scoped) |
| --- | --- |
| CPF, active or inactive persons | `IX_Clients_TenantId_Cpf` on `(TenantId, Cpf) WHERE Cpf IS NOT NULL AND DeletedAt IS NULL` |
| E-mail, active persons | `IX_Clients_TenantId_Email` on `(TenantId, Email) WHERE Email IS NOT NULL AND Status = 'Active' AND DeletedAt IS NULL` |

A guardian's CPF is deliberately not constrained. The handler pre-checks both rules for the per-field answer through a
projection (`ClientMatch`: id and name), not the aggregate, with the default query filters, so a deleted person never
matches ([ADR 0046](0046-separate-soft-delete-and-tenant-query-filters.md)); the indexes are what actually guarantees
uniqueness. Two creates racing past the pre-check are practically impossible for this product, so that case gets no
special handling: any failed save answers a generic `409 Client.SaveFailed` ("Não foi possível salvar a pessoa. Tente
novamente."), without field errors and without claiming a duplicate, whatever the database rejected
([ADR 0048](0048-database-failures-are-generic-to-the-user.md)); the kind and constraint go to the log. A retry goes
through the pre-check again and gets the specific per-field answer.

**Conflict contract.** A duplicate answers `409` with the errors keyed by field (`Cpf`, `Email`, PascalCase like
validation keys), so a form can show each under its input. `FieldError` gained an optional `Meta` string map
(omitted from the JSON when null, so no existing response changes). Both conflicts put `clientId` and `clientName`
there, so the UI can open the record and say whose it is; neither matches a deleted person, so the record can always be
opened. One conflict at a time: CPF is checked first, and the e-mail answer only comes once the CPF is free. A client
reads it from the typed OpenAPI schema (`errors.Cpf[0].meta.clientId`, `errors.Email[0].meta.clientId`).

**Validation layers.** Each rule and its pt-BR message live in the domain; FluentValidation runs it and names the
field ([ADR 0047](0047-validation-rules-live-in-the-domain.md)), and the use case runs it again when it builds the
aggregate. List sizes are capped
(10 guardians, 10 reference contacts) because the issue sets no bound and an unbounded array in a body is an abuse
vector: items of a list over the cap are not validated one by one, and the endpoint reads at most 64 KB of body
(`[RequestSizeLimit]`), above which it answers `413 Request.TooLarge`. On the wire, reference-contact purposes are
strings (`emergency`, `operationalSupport`, `dailyCommunication`), not a JSON enum: a bad enum value fails in the
framework's binder with an English message and no code. Those names exist only in the Application
(`ContactPurposeNames`), which translates them into the domain's `ContactPurpose` flags; a name it does not know is a
structural validator rule (`ContactPurposes.Unknown`), and "at least one" is the `ContactPurposes` value object's.

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
tests cover the EF side (tenant assignment across the graph, isolation, a deleted person's CPF not matching, restoring
stored values and the index definitions).

## Considered and rejected

- **A `Deleted` value in `ClientStatus` next to the soft delete** — tried in the first version of this change and
  removed before merge: two sources of truth that every check had to read together (`IsDeleted || Status ==
  Deleted`), and a deleted status alone would not hide the row from any query.
- **One contacts table with a discriminator** — nullable columns that only apply to one kind, and a purposes column
  that is meaningless for guardians.
- **CPF reserved forever, deleted persons included** — the issue's first wording and the first version of this change;
  changed before merge by product decision: deleting a person frees the CPF, inactivating does not.
- **`IgnoreQueryFilters()` with the tenant re-applied by hand** — how the first version of the CPF lookup saw deleted
  persons; dropped before merge together with the rule that needed it, so no read depends on remembering the tenant
  ([ADR 0046](0046-separate-soft-delete-and-tenant-query-filters.md)).
- **Every conflict in one answer** (`Error.Combine` in the shared kernel) — removed before merge: a general-purpose merge
  in a kernel every service shares, for one call site.
- **Value objects re-validated when EF reads them** (`Create(value).Value` in `HasConversion`) — replaced before merge
  by `Restore`: a stored value that failed a later rule threw on every read of its row.
- **The aggregate as the result of the uniqueness lookups** — replaced before merge by `ClientMatch`: it returned a
  `Client` without its contacts that looked complete.
- **Children built outside the root and handed to `Client.Create`** — the first version of this change, with public
  child factories and an `AssignClient` any domain type could call; replaced before merge by the root creating them.
- **The existing id as a top-level problem extension** — not visible in the generated OpenAPI schema, so untyped.
- **Sending the user to a CPF search instead of the record** — an extra step, and no such search exists yet.
- **JSON enums for purposes and status** — see the validation note above.
- **Brazil's business day (`America/Sao_Paulo`) for "today"** — implemented and reverted before merge; see
  [ADR 0045](0045-backend-works-in-utc.md).
