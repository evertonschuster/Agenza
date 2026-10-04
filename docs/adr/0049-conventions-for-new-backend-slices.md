# ADR 0049 — Conventions for new backend slices

Status: accepted (2026-10); supersedes, as a pattern for new code, the shared `ServiceRelationshipLoader`
of [ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md)

## Context

Two generations of slices coexist in `services-service`
([`backend/docs/ARCHITECTURE.md`](../../backend/docs/ARCHITECTURE.md) §10). The work after the creation of a
served person (#155–#159: query, edit, situation changes, delete) brings the first reads, edits and state
transitions written in the newer style, so whatever it does becomes the reference for everything after it.

Reviewing the code against the target — a rich domain, use cases that own their orchestration, simple
repositories over the `DbContext`'s filters, clean validation, factories, explicit DTOs and no premature
optimization — found shapes that no decision covers, several of them present in two forms:

- `Service` keeps a `List<Tag>`, a navigation to another aggregate root, filled by a `public void SetTags`
  that checks nothing.
- `ServiceRelationshipLoader`, a class shared by two handlers to load a category and tags once, is the only
  orchestration that lives outside a handler.
- `Service` takes its code from a raw-SQL per-tenant sequence inside a transaction it opens itself; the
  transaction leaks into the unit of work and makes the handler call `RollbackAsync`, so that a rejected
  create leaves no gap in the numbering.
- Entities change through one `Update(every field)`. No entity has a state transition yet; the situation
  changes of a served person will be the first.
- Price and maximum discount are primitives validated inside `Service`, while the served person turned every
  value with a rule into a value object.
- Case-insensitive uniqueness uses a generated `NameNormalized` column for names and plain normalized columns
  for CPF and e-mail.

## Decision

**1. The simplest correct form first; an optimization needs evidence.** A command loads the aggregate
through its repository, changes it through behaviour and saves; a query loads through the repository and the
handler maps to the response. Caching, projections inside repositories, raw SQL, compiled queries,
hand-opened transactions, gap-free sequences, denormalized columns and parallel queries in a handler need a
measured problem or a product rule, stated in the PR; one that adds a mechanism needs an ADR. Two things are
shape, not optimization, and stay required: never a query per row (load a set of ids in one query), and
`AsNoTracking` on the pre-check lookups whose result is never changed. A `GetByIdAsync` shared by a query
and a command stays tracked rather than gaining a second, untracked twin. The existing service-code sequence is not changed by
this ADR, and it is not a pattern for a new entity.

**2. Aggregates reference each other by id.** An aggregate holds the id of another aggregate, never a
navigation to it, and loads only its own children. A many-to-many between aggregates is a child of the owning
aggregate that holds the other's id, keyed by `(TenantId, OwnerId, OtherId)` with composite foreign keys to
both ([ADR 0024](0024-database-enforced-data-ownership.md)). A handler that needs another aggregate — to
check it exists, or to show its name — reads it through that aggregate's repository.

**3. A use case owns its orchestration.** One handler per operation, no base handler, and no class between
handlers that orchestrates (loader, manager, service, helper). What is shared has a home: a rule goes to the
domain, a read to a repository method, an input rule to `<Feature>RuleBuilderExtensions`, a mapping to
`<Entity>Response.From<Entity>`. A few orchestration lines repeated between two handlers are accepted.

**4. Behaviour has intention.** A state transition, or a change to a part of the aggregate that has its own
rule, is a named method (`Inactivate()`, `ReplaceContacts(…)`) returning `DomainResult` and refusing an
invalid transition with a named error. A whole-record `Update(…)` stays acceptable for an edit form over free
data with no transition. A method that sets state without checking anything (`SetX`) does not exist.

**5. When a value is a value object.** When it has a format or a normalization (CPF, e-mail, phone), a rule
over several values (a duration range), a closed set (a palette), a rule that needs a parameter (a birth date
and today), when it is money or a percentage, or when more than one type uses its rule. Free text bounded only
by its length (a name, a description, a relationship) may stay a primitive validated by its owner with a named
`DomainError`.

**6. Case-insensitive uniqueness follows what is displayed.** When the normalized value is also what is shown
(an e-mail in lowercase, CPF digits), the value object normalizes it and the column stores it. When the
display keeps the user's form (a name with its casing), the unique index uses a generated normalized column
([ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md)). Both are current; the criterion
picks one.

**7. Factories are static methods on the type.** `Create` on roots and value objects, `internal static
Create` on children, called only by their root, and `Restore` on value objects for EF. No `<X>Factory` or
builder classes, no public constructors. The Application's `ToModel` turns a command into these calls. A
root's id is minted by its caller, a child's by its root.

**8. DTOs are explicit records at the Application edge.** The input is the command or query record and its
nested `<Thing>Input` records — primitives, strings, `DateOnly`, ids; no domain type, no tenant. The output is
`<Entity>Response` with a static `From<Entity>(entity, …)` built from the aggregate plus what the handler read
explicitly for it; another aggregate appears as a small `<Entity>Summary`; value objects flatten to their
primitive and enums to camelCase strings. No mapping library, no DTO in the domain, no entity past the
handler.

## Consequences

- [`backend/docs/ARCHITECTURE.md`](../../backend/docs/ARCHITECTURE.md) carries these rules. The skills
  `agenza-backend-slice` (building) and `agenza-backend-review` (reviewing) route to it.
- Three shapes join the older generation in ARCHITECTURE §10, each converted only by a change that touches
  it: `Service.Tags`/`SetTags` when the service–tag relationship changes, `ServiceRelationshipLoader` when
  the creation or edit of a service changes, and the primitive price and discount when those fields change.
- Once `Service` holds tag ids, listing services needs one more query for the tag names — the same one-query
  read of a set of ids it already does for category names.
- Create and edit handlers of the same aggregate repeat a few lines of orchestration. That is the price of
  reading each use case on its own.

## Considered and rejected

- **A shared loader as the pattern for a read that several handlers need** — what ADR 0012 created. It is an
  orchestration layer between handlers and repositories that each new feature would be tempted to grow, and
  the repository already is that seam.
- **Navigations between aggregates for the convenience of responses** — saves one query on a read and couples
  two consistency boundaries.
- **Storing every normalized value and dropping generated columns** — proposed during the analysis that led
  to this ADR and dropped before it: a name stored in lowercase loses the casing the user typed, which is what
  the interface shows.
- **One whole-record `Update` for every change, transitions included** — a status change would become "set
  the status", and the rule of which transitions are valid would have nowhere to live.
