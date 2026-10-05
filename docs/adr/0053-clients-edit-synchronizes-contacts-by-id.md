# ADR 0053 — Clients: editing a person synchronizes its contacts by id

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md), which
announced "one operation that synchronizes the lists by id and re-checks the guardian and limit rules on the result"

## Context

#156 adds `PUT /api/v1/clients/{id}`: edit the person's data and add, change or remove its guardians and reference
contacts in the same operation. The rules come from #139 and #154; the open points the issue leaves are how a
contact is identified, what a removal means, how a foreign contact id is answered, and how the uniqueness rules of
creation apply to a person that already exists.

## Decision

**Request.** The body is the person's current data plus the final lists of contacts, in the shape of the creation body
with an optional `id` on each contact (`UpdateGuardianInput`, `UpdateReferenceContactInput`, `UpdateClientCommand`
with the route id as `ClientId`). A contact with an `id` is that contact, changed in place; a contact without one is
new and gets its id from the root; a contact the body omits is removed. A missing (`null`) list means no contacts of
that kind, as it does on creation. Neither the tenant nor the situation is a member of the command: a `tenantId` or a
`status` in the body is ignored by the binder, so this endpoint cannot move a person between tenants or between
active and inactive. The creation inputs are not reused with an added `id`: creation would have to accept and ignore
a member that means nothing there.

**Domain.** `Client.Update(…)` is one whole-record method ([ADR 0049](0049-conventions-for-new-backend-slices.md) §4:
an edit form over free data, no transition). It takes the value objects already built and the contacts as
`ContactChange<TData>(Guid? Id, TData Data)` records, and runs in two phases so a failure never leaves a
half-updated person: first every rule over the result (list limits, a guardian for a minor, ids that belong to this
client's own contacts of that kind, no id twice, every contact's name and relationship), then the assignments and
the synchronization of both lists. The minor rule is evaluated on the **final** guardians, so removing the last
guardian of a minor is refused, and without a birth date nothing is asked. A contact id that is not one of the
client's loaded contacts is `Client.ContactNotFound`; the child's `Update` is `internal`, so only the root changes a
contact.

**Removal.** A removed contact is soft-deleted like every other record (`BaseEntity`: the collection no longer holds
it, EF marks it as an orphan and the save interceptor stamps `DeletedAt`); its row stays in the database and leaves
every read. There is no retention or anonymization policy yet (out of scope of #139), so removing a contact does not
erase its data.

**A contact id that is not this person's.** `404 Client.ContactNotFound`, with no field. The answer is the same
whether the id never existed, belongs to another person, belongs to another tenant, was already removed or sits in
the other list, so it reveals nothing about records the caller cannot see; nothing is written. The domain owns the
rule (it holds the contacts); the handler translates that one domain code to `NotFound`, with a message that tells the
user to reload, rather than repeating the check. A person that does not exist, belongs to another tenant or is
deleted is `404 Client.NotFound`.

**Uniqueness on an existing person.** The rules of ADR 0044, comparing against every other client:

| Rule | On edit |
| --- | --- |
| CPF, active and inactive persons | pre-checked excluding the person being edited, even when the person is inactive |
| E-mail, active persons | pre-checked excluding the person being edited, **only when the person is active**: an inactive person's e-mail takes part in no rule, so it can be edited to an e-mail an active person uses (reactivation checks it again) |

The same field-keyed conflicts (`Client.DuplicateCpf`, `Client.DuplicateEmail`, with `clientId` and `clientName` in
`meta`) and the same generic `Client.SaveFailed` for whatever the database rejects. The repository's two lookups gained
an `excludeClientId` instead of the handler comparing ids afterwards ([ADR 0049](0049-conventions-for-new-backend-slices.md)
keeps the read in the repository).

The text of #139, #154 and #156 still says the CPF is unique among active, inactive **and deleted** persons. ADR 0044
records the product decision taken before #154 merged — deleting a person frees its CPF — and the unique index and the
lookups already behave that way. Editing follows 0044 so creation and edition answer the same; making a deleted
person keep its CPF would be a new decision that also changes creation (index, migration, a lookup that sees deleted
rows).

**Shared pieces.** What creation and edition both need moved to the feature root, where ARCHITECTURE §2 sends a type
the second operation needs: every input rule that is not about a list item's shape (`MustBeValidFullName`,
`MustBeValidBirthDate`, `MustBeValidEmail`, `MustBeValidAdministrativeNotes`, the list-size and minor rules,
`MustHaveValidPurposes`) into `ClientRuleBuilderExtensions`, so the two validators cannot drift, and the
primitives-to-`GuardianData`/`ReferenceContactData` mapping into `ClientContactMapping`. The conflict messages and the
orchestration lines stay in each handler, as ADR 0049 accepts.

**Persistence.** The children's `Id` is configured `ValueGeneratedNever()`. The root mints a new contact's id
(`Guid.CreateVersion7()`), and for a key EF considers store-generated, a new entity found through the collection of a
tracked, loaded client with that key already set is tracked as `Modified`, not `Added`: the save tries an `UPDATE` of
a row that does not exist and fails with a concurrency exception. Creation never showed it because `Add` marks the
whole graph as new. The column and the schema are unchanged — the migrations differ sees no change — so there is no
migration; the model snapshot keeps its old, harmless `ValueGeneratedOnAdd` annotation until the next migration
regenerates it. A persistence test pins the configuration.

## Consequences

- Wire shape: `PUT /api/v1/clients/{id}` answers `200` with the same `ClientResponse` as creation; `400` validation (a
  contact id repeated in a list is `Client.DuplicateContact` on the list), `404`, `409`, and `413` over 64 KB.
  `clientId` is a member of the generated body type (as `tagId` is for tags) and the route wins.
- One `SaveChanges` is one transaction: contacts added, changed and removed commit together with the person or not
  at all. Verified by hand on a disposable PostgreSQL (below).
- A pre-check that passes while another request commits first ends in the database's unique index and the generic
  `409 Client.SaveFailed`; the retry gets the specific answer ([ADR 0048](0048-database-failures-are-generic-to-the-user.md)).
- No concurrency token: two people editing the same person at once is last write wins for the person's data. A
  request only removes the contacts it loaded, so a contact another request added after it loaded survives it, and a
  contact id the other request had already removed before this one loaded is answered `Client.ContactNotFound`.

Verified by hand, per [ADR 0026](0026-remove-dedicated-runtime-tests.md), against a disposable PostgreSQL 18 with the
real services and a real login (78 checks): contacts synchronized by id with the removed rows kept and stamped
`DeletedAt`; the minor rule on the final guardians; foreign contact ids (same tenant, another tenant, unknown, wrong
list) answered `404` with nothing written; other-tenant and deleted persons answered `404` and left unchanged; CPF
and e-mail rules by situation; `tenantId` and `status` in the body ignored; and 12 rounds of two edits racing for the
same CPF, each ending with exactly one `200` and a `409` whose person, CPF and contacts are untouched (11 of them
through the unique index, answered `Client.SaveFailed`).

## Considered and rejected

- **The creation inputs with an optional `id`** — creation would accept a member it ignores, and one schema would
  describe two different contracts.
- **`ReplaceContacts` and a person-data `Update` as two methods** — the minor rule joins the birth date and the
  guardians, so two methods would each check half of it, and two calls would not be one atomic change.
- **Checking the contact ids in the handler as well as in the domain** — two copies of one rule; the handler maps the
  domain's error instead.
- **`400` on the contact's field for a foreign id** — the `id` is not a visible form field, so no input can show the
  error; `409` was rejected as well, since 409 here means a duplicate or a failed save.
- **Rejecting a missing list with `400`** — it diverges from creation and adds a rule the issue does not ask for.
- **Physical removal of a removed contact** — it needs a way around the soft-delete interceptor, a new mechanism with
  its own ADR, and differs from the rest of the service.
- **`ValueGeneratedNever()` on every entity's key** — it would rewrite every key annotation to fix two children; the
  other aggregates are only ever added through `Add`.
- **A row-version column for concurrent edits** — a migration and a contract member the issue does not ask for.
