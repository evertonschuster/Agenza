# ADR 0028 — Reset EF migrations before the first deployment

Status: accepted (2026-07)

## Context

Both DbContexts accumulated incremental migrations while the domain model,
tenant constraints, schema ownership, and bootstrap strategy were still
being designed. Several migrations contain transitions and data preflights
that are useful only when upgrading an older database.

The application is still a demo, has no production deployment, and has no
shared database whose data must be preserved. The owner explicitly chose to
replace the histories before the first deployment rather than carry
development-only transitions indefinitely.

## Decision

Delete every existing EF migration and model snapshot, then generate one
`InitialCreate` from the current model for each DbContext:

- `IdentityDataContext` owns the `identity` schema and
  `identity.__EFMigrationsHistory`;
- `ServicesDataContext` owns the `services` schema and
  `services.__EFMigrationsHistory`.

The new baselines contain the final tables, indexes, computed normalized-name
columns, soft-delete indexes, and composite tenant relationships directly.
They intentionally contain no backfill or compatibility path from the
deleted histories.

PostgreSQL roles and schema grants remain in
`infra/postgres/init/001-service-roles.sh`, because database identities and
privileges are environment bootstrap concerns rather than EF model state.
Compose now uses a named data volume and publishes a configurable local port.

This is a one-time pre-deployment exception to the repository rule against
rewriting applied migrations. After this baseline, every schema change is a
new additive migration; existing migration files must not be edited.

## Fitness functions

- `dotnet ef migrations list` reports one `InitialCreate` for each context;
- both migrations apply successfully to an empty PostgreSQL database using
  the restricted service roles;
- the resulting database has separate schema-scoped history tables;
- architecture guards reject destructive `Up` operations without an
  explicit migration-safety review marker; and
- the Compose API-contract job rebuilds the empty database and reaches
  service readiness.

## Consequences

Existing local databases cannot upgrade to the new baseline. They must be
backed up if necessary and recreated from an empty volume. This is accepted
because no deployed or shared data exists.

The rollback is to revert this change and reconnect the matching old
database volume. Once the new baseline is deployed anywhere that matters,
another history rewrite is prohibited; future changes use incremental
migrations and normal expand/migrate/contract practices.
