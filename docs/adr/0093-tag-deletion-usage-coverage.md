# ADR 0093 — Guard tag deletion against forgotten local relationships

Status: accepted (2026-11); complements [ADR 0089](0089-clients-tags.md).

## Context

Deleting a tag in use is blocked by explicit client and service checks. As new relationships are
added, a developer could add a reference to `Tag` without updating deletion. A registry of usage
providers would move this omission to registration rather than detect it. With two relationships,
the existing handler remains simpler and its behavior and HTTP contract stay unchanged.

## Decision

The services persistence test suite compares every foreign key to `Tag` in the EF model with an
inventory of executable usage scenarios. A relationship is identified by its declaring entity and
foreign-key properties, so another FK on an existing entity also requires attention. The inventory
includes the client child and the shared `ServiceTags` join entity. Each scenario must actually
create its claimed relationship, invoke the real deletion handler with the EF repositories, and
prove that the owning tenant receives `Tag.InUse` without a save. A different tenant cannot access
the tag. A negative test demonstrates that omitting a known relationship is detected. The existing
backend CI already runs this test project.

The inventory is test code, not a source of domain rules. A new relationship requires its own
scenario and implementation of the correct business check. Existing persistence and handler tests
continue to cover inactive and deleted records, the count, the response and the bounded listing.

## Limits

- The check covers direct foreign keys to `Tag` in this EF model. References in JSON, arrays,
  unmanaged tables, other databases or other services are outside its scope; their owners need an
  explicit integration contract and tests.
- EF InMemory exercises the handler and model, not PostgreSQL constraint enforcement. A passing
  inventory does not by itself prove all business semantics, every call path or isolation under
  concurrency.
- The existing association-versus-soft-deletion race documented in ADR 0089 remains unchanged. A
  fix needs a shared concurrency protocol and a deterministic PostgreSQL test in a separate change.

## Alternatives

- **Only document a checklist.** Rejected because it does not automatically detect a forgotten local
  relationship.
- **Introduce a provider registry now.** Deferred: registration can also be forgotten, and the
  current two checks do not justify the extra production abstraction. Reconsider if more real
  consumers make composition materially simpler, retaining an independently verifiable guard.
- **Discover runtime checks from database metadata.** Rejected because schema metadata cannot
  decide whether a deleted or inactive record is a business blocker, nor produce its safe label.
