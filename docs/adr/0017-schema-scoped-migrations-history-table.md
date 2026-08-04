# ADR 0017 — Schema-scoped EF migrations history

Status: accepted (2026-07).

## Context

Multiple services share one PostgreSQL database while owning separate schemas.
Using the default public `__EFMigrationsHistory` table would mix independent
migration chains and require broader privileges than each service needs.

## Decision

- Each service configures `MigrationsHistoryTable("__EFMigrationsHistory",
  "<service-schema>")` in both runtime and design-time DbContext setup.
- A service's migrations create/change objects only in its own schema.
- Runtime and design-time factories must remain identical for provider and
  history-table configuration.
- Database roles receive only the schema privileges required by their service.
- Migration generation and application use the owning service's project and
  configuration; no central cross-service migration assembly is introduced.

## Verification

- Design-time `dotnet ef` commands resolve the same history table as runtime.
- The full migration chains apply through the AppHost/PostgreSQL contract gate.
- Architecture and database ownership checks prevent cross-schema writes.

## Consequences

Services can evolve independently inside a shared PostgreSQL instance without
sharing migration state or write privileges.
