# ADR 0006 — Tenant request boundary, auditable entities, and repository conventions

Status: accepted (2026-07), amended by ADRs 0008, 0009, 0014, 0019, and 0024.
This document records the current decision only.

## Context

Tenant enforcement, audit fields, soft deletion, identifiers, and common EF
repository behavior must be consistent across resource services and difficult
to omit in a new vertical.

## Decision

### HTTP tenant boundary

- Resource APIs use `TenantHeaderFilter` with `Admin.Identity.Client`.
- Tenant-scoped requests require `X-Tenant-Id` to be a valid UUID matching the
  authenticated token's `tenant_id` claim.
- Missing/mismatched tenant context fails closed before business execution.
- `[IgnoreTenant]` is reserved for reviewed, genuinely tenant-free endpoints.

### Entity conventions

- Service-local `BaseEntity` owns identifier and auditable/soft-delete fields
  with no public setters.
- New identifiers use the repository's sequential GUID/UUID v7 convention.
- Tenant-owned roots use the service-local `TenantOwnedEntity`/`ITenantOwned`
  contract described by ADR 0009.
- Audit and tenant values are assigned by persistence infrastructure, not by
  request DTOs or handlers.

### EF and repository conventions

- Shared `OnModelCreating` conventions configure audit/soft-delete behavior once.
- Global query filters read the live DbContext tenant and deletion state; they
  do not capture request values when the model is built.
- Generic repository helpers cover repeated persistence mechanics. Feature
  repositories expose intent-revealing methods when business queries differ.
- Repository methods do not accept arbitrary tenant ids and do not commit
  internally.
- Tenant-aware uniqueness and relationships are enforced at the database layer
  as finalized by ADR 0024.

### Tests

- Unit tests use NSubstitute around Application ports.
- Tenant assignment/filtering and relationship safety use the current narrow
  persistence/runtime tiers described by ADRs 0019, 0024, 0026, and
  `docs/QUALITY.md`.

## Consequences

Tenant/security behavior is centralized and mechanically testable. A new
resource endpoint or entity inherits the safe defaults instead of reimplementing
header checks, audit fields, filters, and tenant predicates manually.
