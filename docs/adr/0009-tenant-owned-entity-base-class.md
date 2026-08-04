# ADR 0009 — TenantOwnedEntity base class

Status: accepted (2026-07), with expected exception behavior replaced by ADR
0014.

## Decision

Each service with tenant-owned entities defines a service-local
`TenantOwnedEntity` base that:

- extends the auditable `BaseEntity`;
- implements `ITenantOwned`;
- exposes `TenantId` without a public setter;
- allows one infrastructure-owned assignment for a previously unassigned new
  entity;
- treats reassignment or an invalid tenant as a programming violation.

Domain/application code never chooses tenant ownership. EF save interception
per ADR 0008 performs assignment, and query filters/constraints enforce
isolation.

## Consequences

Tenant ownership has one reusable entity shape without moving business entities
into a cross-service shared domain package. Each service remains responsible for
its own domain model and migrations.
