# ADR 0002 — One Postgres instance, one schema per service

Status: accepted (2026-07)

## Context

Every service needs persistence; running one database container per
service makes local dev and small deployments needlessly heavy, but a
shared schema would couple services at the data layer — the classic
distributed-monolith failure mode.

## Decision

All services share one Postgres instance/database (`appdb`), and each
service owns a schema named after it (`identity`, `services`, ...) set
via `modelBuilder.HasDefaultSchema("<name>")` in its DbContext. A
service's migrations touch only its own schema. No service ever queries
another service's schema — cross-context data flows through APIs.

## Consequences

- Single `postgres` container locally (docker-compose and Aspire).
- Migrations can't collide across services.
- If a service later needs its own instance (scale, isolation,
  compliance), moving a whole schema out is straightforward.
- Discipline is by convention + review: Postgres won't stop a service
  from querying another schema, so treat any cross-schema SQL as a
  blocking review finding.
