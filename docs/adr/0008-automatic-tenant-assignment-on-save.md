# ADR 0008 — Automatic tenant assignment on save

Status: accepted (2026-07); current regression coverage is provided by the
narrow persistence tier from ADR 0019.

## Decision

- New entities implementing `ITenantOwned` receive the current authenticated
  tenant in the EF save interceptor.
- Assignment happens before persistence together with audit-field handling.
- The interceptor fails closed when a new tenant-owned entity is saved without a
  valid current tenant.
- Handlers, commands, mappers, and repository methods do not accept or assign
  arbitrary tenant ids.
- Existing tenant ownership is immutable through normal application behavior.

## Rationale

Tenant ownership is request infrastructure, not business input. Centralizing it
eliminates repeated manual assignment and prevents a new handler from forgetting
the security boundary.

## Verification

Persistence tests prove automatic assignment, missing-context failure, and
cross-tenant query isolation using the current DbContext conventions.
