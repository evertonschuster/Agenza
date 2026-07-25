# ADR 0024 — Database-enforced service ownership and tenant relationships

Status: accepted (2026-07); supersedes ADR 0013

## Context

The services share one PostgreSQL database and currently connect as the
cluster superuser. Schema names and application query filters communicate
ownership, but PostgreSQL does not enforce it. In the catalog model, a
service row can also reference a category or tag from another tenant because
the foreign keys use only the globally unique entity ids.

Application checks remain useful, but a missed predicate or a compromised
service connection must not silently become cross-module or cross-tenant
access.

## Decision

Each backend service receives its own non-superuser login role. The identity
role owns only the `identity` schema and the services role owns only the
`services` schema. `PUBLIC` receives no create or usage privilege on those
schemas, and each application connection string uses its service role.
The cluster administrator remains a bootstrap/migration concern, not an
application runtime identity.

Tenant-owned principals expose `(TenantId, Id)` as a database candidate key.
Tenant-owned relationships use composite foreign keys:

- service to category: `(TenantId, CategoryId)`; and
- service-tag membership to both service and tag, with `TenantId` stored in
  the join row.

The forward migration first checks existing data for cross-tenant
relationships, aborts with a diagnostic if any exist, then backfills the join
tenant id and creates the constraints. Historical migrations are not edited.
The rollback restores the previous keys and removes only the derived join
tenant column.

## Fitness functions

- A real PostgreSQL test proves a cross-tenant category or tag relationship
  is rejected.
- A database ownership check proves each application role can use its own
  schema and cannot use the other service's schema.
- The architecture guard requires composite tenant foreign keys for every
  configured relationship between tenant-owned entities.

## Consequences

Local database initialization is slightly more involved and existing local
volumes must be recreated once to receive the roles and grants. The schema
continues to live in one PostgreSQL cluster; this decision hardens the
existing modular monolith and does not split it into database servers or
microservices.

The migration can fail on previously inconsistent data. That is a safety
feature: operators receive the offending relationship counts before any
constraint change.
