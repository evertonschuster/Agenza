# ADR 0013 — Tenant-scoped relationships stay enforced at the application layer, not by composite FKs

Status: accepted (2026-07)

## Context

A hardening review of `services-service` noted that `Service.CategoryId` and
the `ServiceTags` join table both reference the target entity by `Id` alone —
`FK_Services_Categories_CategoryId`, `FK_ServiceTags_Services_ServiceId`, and
`FK_ServiceTags_Tags_TagsId` do not include `TenantId`. In principle, nothing
at the database level stops a `Service` row belonging to tenant A from
pointing its `CategoryId` (or a row in `ServiceTags`) at a `Category`/`Tag`
belonging to tenant B, if a row were inserted outside the normal
application flow (a bulk import, a manual `INSERT`, a future admin tool that
writes directly to the database).

Today, isolation for these relationships is enforced entirely at the
application layer:

- `ICategoryRepository`/`ITagRepository` queries run through
  `ServicesDataContext`'s global query filter (`ApplyAuditableConventions`,
  see docs/adr/0006), which reads `CurrentTenantId` off the live `DbContext`
  instance and hides every other tenant's rows automatically.
- `ServiceRelationshipLoader` (`Application/Services/`) is the only path that
  attaches a Category or Tags to a Service, and it only ever looks them up
  through those tenant-scoped repositories — a cross-tenant id is invisible
  to it and comes back as `Category.NotFound`/`Tag.NotFound`, never attached.

The question was whether to close the theoretical gap by adding
tenant-aware composite constraints: `TenantId` on the `ServiceTags` join
table, a composite unique key `(TenantId, Id)` on `Categories`/`Tags`, and
composite FKs `(TenantId, CategoryId) → Categories(TenantId, Id)` /
similar for the join table.

## Decision

**No schema change.** FKs stay `Id`-only. The project owner confirmed the
business rule directly: a Service's Category and Tags must already belong to
the same tenant as the Service by construction — every write path that can
create this relationship goes through `ServiceRelationshipLoader`, which
makes that guarantee, and there is no accepted path (bulk import, direct
SQL, admin tooling) that writes to these tables outside of EF today. Adding
a composite FK would be schema churn (new columns, backfill, index changes)
for a scenario that isn't reachable through the application as it exists.

Isolation for these relationships remains an application-layer guarantee:
the `ITenantOwned` global query filter plus `ServiceRelationshipLoader`'s
tenant-scoped lookups. This is defense-in-depth the same way Domain's
throwing constructors are (docs/adr/0012) — not a DB-level invariant.

## Consequences

- Integration tests (`ServicesEndpointTests`) assert the guarantee
  end-to-end: creating or updating a Service with a `CategoryId`/`TagIds`
  belonging to another tenant returns `404 Category.NotFound`/`Tag.NotFound`,
  exactly as an unknown id would — proving the cross-tenant row is invisible
  to the loader, not just that the query filter exists in isolation.
- If a future feature introduces a write path to `Services`, `Categories`,
  `Tags`, or `ServiceTags` that bypasses `ServicesDataContext` (a bulk
  importer, a data-migration script, a second service writing to the same
  schema), revisit this decision — that is exactly the scenario a
  DB-level composite constraint would guard against and an ORM-level query
  filter cannot.
- This does not change `FK_Services_Categories_CategoryId`,
  `FK_ServiceTags_Services_ServiceId`, or `FK_ServiceTags_Tags_TagsId` — all
  three remain plain `Id` references, unchanged from their original
  migrations (`20260711172110_RenameServiceOfferingToServiceAndExtend`,
  `20260720235529_AddCategoryForeignKeyToService`).
