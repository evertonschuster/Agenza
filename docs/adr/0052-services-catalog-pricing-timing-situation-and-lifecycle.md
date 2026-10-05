# ADR 0052 — Services catalog: pricing, timing, situation and lifecycle

Status: accepted (2026-10); carries out the conversions that
[ADR 0049](0049-conventions-for-new-backend-slices.md) announced for `Service` (tags by id, money and percentage as
value objects, no loader)

## Context

Issue #141 turns the existing `Service` into the catalog of what a business offers: a service has a name, a
category, tags, an internal and a client-facing description, a default duration with preparation and cleanup
time, a price that is either fixed or negotiated, and a situation (active or inactive) that keeps its history.

The model it started from required a price and a maximum discount for every service, kept one description,
carried its tags as a navigation to `Tag`, and had no situation. [ADR 0049](0049-conventions-for-new-backend-slices.md)
had already listed three shapes of this aggregate to convert when a change touched them — `Service.Tags`/`SetTags`,
`ServiceRelationshipLoader` and the primitive price and discount — and this change touches all three.

## Decision

**Shape.** `Service` refers to its category by `CategoryId` and to its tags through `ServiceTag` children, keyed
`(TenantId, ServiceId, TagId)` — unique among live rows — with composite foreign keys to both roots (`Restrict` on
the tag side). Price and maximum discount are the value objects `Money` and `Percentage`; durations are the value
object `ServiceDuration`. `ServiceRelationshipLoader` and `ServicePersistenceErrorMapper` are gone: each handler
reads the category and the tags it needs, and a failed save answers `Service.SaveFailed`
([ADR 0048](0048-database-failures-are-generic-to-the-user.md)). Taking a tag off a service, or deleting the service,
soft-deletes the link. The child's `Id` is `ValueGeneratedNever`: the root mints it, and without that EF reads a
link added to an already tracked service as an existing row and issues an `UPDATE`. Any child created by its root
and added to a tracked root needs the same.

**Pricing.** `PricingType { Fixed, Variable }` (wire: `fixed`, `variable`) and an optional `Money` price. A fixed
price requires an amount and accepts zero, which is a free service; a variable price takes none. An amount sent
with `variable` is refused (`Service.PriceNotAllowed`) instead of ignored: accepting a reference amount later is
compatible, silently dropping input is not. There is no billing unit and no professional link; both stay for the
schedule and team refinement, as the issue recommends.

**Timing.** `ServiceDuration` holds the default duration (1 to 1440 minutes), preparation and cleanup (0 to 1440,
absent means 0) and optional minimum and maximum limits that, when present, bracket the default duration. The
domain derives `TotalDurationMinutes` — preparation + duration + cleanup — and the response carries it as
`totalDurationMinutes`. How the schedule reserves it is a separate change.

**Descriptions.** `internalDescription` (staff) and `clientDescription` (what a client-facing surface will show)
are independent and optional, 500 characters each. The old `Description` column is now `InternalDescription`.

**Situation.** `ServiceStatus { Active, Inactive }`, stored as text with a `CHECK`. The transitions are named,
`Inactivate()` and `Reactivate()`, and refuse a repetition (`Service.AlreadyInactive`, `Service.AlreadyActive`, 400
through the domain gate). They are `POST /services/{id}/deactivate` and `/reactivate`, answering 204; the frontend's
loaders revalidate. An inactive service stays readable and editable, keeps its name and its tags, and shows in the
list; "deleted" is still the soft delete and nothing else. Keeping inactive services out of new appointments is the
schedule's rule (#153); it asks the list for `status=active`.

**Kept, as the owner decided.** The maximum discount and the duration limits stay, now optional, and so does the
per-tenant sequential `code` ([ADR 0049](0049-conventions-for-new-backend-slices.md) left it open and this change
does not touch it).

**List.** `GET /services?page&pageSize&search&categoryId&tagIds&status`. `tagIds` is a repeated query parameter and
matches a service carrying **any** of them; filters of different kinds combine with AND. `status` is `active`,
`inactive` or `all`, and defaults to `all`. Ordered by name, then id, so a page never repeats or skips a row.

**Name uniqueness** is unchanged: case-insensitive per tenant among services that are not deleted, **inactive ones
included**, so reactivating can never collide. The conflict is keyed by `name` and carries `serviceId` and
`serviceName` in `meta`, so a client can open the existing service. Deleting a service frees its name.

**Delete** stays a soft delete. The rule "only without appointments or other history" cannot be enforced yet because
nothing references a service. The check that answers 409 and points to deactivation arrives with the first aggregate
that does (#153), the same way `Tag.InUse` and `Category.InUse` already count live references (inactive services
count). Until then deleting a service always succeeds.

**Contract.** `PUT` carries the final data: `tagIds` null means no tags, at most 10, and the body is capped at 64 KB.
`code` stays read-only. Validation and conflicts are keyed per field in camelCase
([ADR 0051](0051-camelcase-error-keys-on-the-wire.md)).

**Migrations.** `ServiceTagsAsChildren` turns the join table into the children's table and keeps its rows;
`AddServiceCatalogFields` adds the new columns with the defaults `Fixed`, `Active` and 0, relaxes `NOT NULL` on
price, maximum discount and the limits, and renames `Description`. They are not purely additive — two renames, the
nullability change and the link table rewrite — and each preserves data. Both were verified on a disposable
PostgreSQL 18 with legacy rows: up, down and up again, the filtered unique index and the composite foreign keys on
the links, the `CHECK`s, and the case-insensitive name index.

## Consequences

- The generated frontend types change incompatibly (`description` → `internalDescription`, nullable `price`,
  `tagId` → `tagIds`, the new operations). No screen consumes them yet; the same change commits the regenerated file.
- Deleting a tag while a create that uses it is in flight can leave a live link to a tag that is soft-deleted. Reads
  omit that tag. The join-table design had the same window; no lock is added for it.
- `AddServiceCatalogFields` rolled back gives a service with a variable price a price of 0, restores the limits to
  the duration and drops the pricing type, the situation, the client description and the preparation and cleanup
  times. Those values are lost.
- `Money` has no currency; reais are implied by the product.

## Considered and rejected

- **Removing the maximum discount, the duration limits and the code** — offered, and the owner chose to keep them.
- **A variable price that also carries a reference amount** — see Pricing; it can be added later without breaking
  anyone.
- **Tags in the list filter as "all of them"** — the owner chose "any of them".
- **A default list of active services only, as in the people list** — the owner chose all, with the situation shown
  on each item.
- **A value object holding pricing type, price and discount** — EF cannot map a multi-column value object under the
  InMemory persistence tests, and the pairing of type and price is a rule of the aggregate, not of one value.
- **`PATCH /services/{id}/status` with the target situation in the body** — two named transitions say what they do
  and refuse the repetition by name.
- **Returning the resource from deactivate and reactivate** — costs a category and a tags read per call for a
  screen that revalidates anyway.
