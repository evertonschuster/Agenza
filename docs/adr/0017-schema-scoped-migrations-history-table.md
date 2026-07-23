# ADR 0017 — Schema-scoped `__EFMigrationsHistory` per service

Status: accepted (2026-07)

## Context

docs/adr/0002 decided one shared Postgres database (`appdb`) with one
schema per service (`identity`, `services`), set via
`modelBuilder.HasDefaultSchema("<name>")` in each `DbContext`, and
claimed as a consequence that "migrations can't collide across
services."

That claim was incomplete. `HasDefaultSchema` only moves the schema of
**entity** tables built from the model — it has no effect on EF Core's
own bookkeeping table, `__EFMigrationsHistory`, which Npgsql creates in
the connection's default schema (`public`) unless a
`MigrationsHistoryTable(name, schema)` option is configured separately
on `UseNpgsql(...)`. Neither `IdentityService.Infrastructure`'s nor
`ServicesService.Infrastructure`'s `DependencyInjection.cs` (nor their
design-time `*DataContextFactory.cs`) configured this option, so both
services were tracking their own, entirely independent migration sets
in the exact same `public.__EFMigrationsHistory` table.

Both services also call `Database.MigrateAsync()` from a startup
`IHostedService` (`DatabaseSeeder`/`DatabaseMigrator`, guarded by
`Migrations:RunOnStartup`, default `true` — see docs/MONOREPO.md's
"Known gaps"), and both `docker-compose` and the Aspire `AppHost`
(`.WithDataVolume()` on the Postgres resource) start both services
against the same database at once. On a fresh database this is
survivable — Npgsql creates the shared history table once, then each
service inserts its own rows keyed by its own migration ids, no
migration id in the repo currently collides across services (verified
by listing every migration file in
`IdentityService.Infrastructure/Persistence/Migrations/` and
`ServicesService.Infrastructure/Persistence/Migrations/`: each id is a
service-local timestamp, none shared). But it is still architecturally
wrong for a repo whose entire schema-per-service design is meant to
keep services independent at the data layer:

- The two services' migration histories are interleaved in one table
  with no way to tell, from the table alone, which row belongs to which
  service.
- Nothing prevents a future migration-id collision (e.g. two migrations
  scaffolded in the same minute in two different terminals).
- Both services perform DDL (`CREATE TABLE IF NOT EXISTS
  "__EFMigrationsHistory"` on first run, then `INSERT`) against the same
  table around the same time at every concurrent startup — a needless,
  avoidable point of contention layered on top of the already-tracked
  `Migrations:RunOnStartup` concurrency gap.
- Operationally, `SELECT * FROM public."__EFMigrationsHistory"` today
  returns a merged, uninterpretable list of both services' migrations —
  there is no way to ask "what has services-service applied?" without
  filtering by knowing every one of its migration id prefixes by heart.

## Decision

Each service now configures its own schema-qualified
`__EFMigrationsHistory` table, matching the schema its entities already
live in:

```csharp
options.UseNpgsql(connectionString,
    npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "identity"));
// and, symmetrically, "services" in ServicesService.Infrastructure
```

Applied in both the runtime DI registration
(`AddIdentityInfrastructure`/`AddServicesInfrastructure`) and the
design-time `IDesignTimeDbContextFactory` used by `dotnet ef` tooling,
so `dotnet ef migrations add/list/database update` run against the same
table the running service uses.

This is a **code-only** change in this PR — no migration was added, no
database was touched, and nothing here executes against any real
Postgres instance. See "Migration runbook" below for what an operator
must do the next time they start either service against a database that
already has rows in `public.__EFMigrationsHistory`.

## Consequences

**Gained**: each service's migration history is genuinely isolated,
matching the isolation the rest of docs/adr/0002 already assumes.
`identity.__EFMigrationsHistory` and `services.__EFMigrationsHistory`
can each be queried, backed up, or reasoned about independently. docs/adr/0002's
"migrations can't collide across services" claim is now actually true
at the tooling level, not just true by coincidence of today's migration
ids.

**Risk this creates, and why it's not applied automatically**: on any
Postgres instance that already has migration history recorded in
`public.__EFMigrationsHistory` — which is the *normal* state of any
local dev environment that has already run `docker compose up` or
`dotnet run --project backend/AppHost` at least once, since Aspire's
Postgres resource uses `.WithDataVolume()` (a persistent named volume)
— the next `MigrateAsync()` call per service will look for its history
in the new schema-qualified table, find nothing, and attempt to
re-apply every migration from scratch, including `CREATE TABLE`
statements for tables that already exist. This fails loudly
(`42P07 relation already exists`) rather than silently corrupting data,
but it does break local dev startup until handled. This is exactly the
kind of change `agent-skills/agenza-migration-safety` and root
`AGENTS.md`'s question policy require flagging rather than executing
unattended — no docker/psql command was run as part of this change.

### Migration runbook (do this once, before your next local run)

Pick whichever applies to your machine:

**Option A — no local data worth keeping (recommended for most dev
setups; the seeded users/tenants are throwaway dev fixtures anyway):**

1. Stop AppHost / `docker compose down`.
2. Remove the Postgres data volume:
   - Aspire: `docker volume ls | grep postgres` to find the volume
     Aspire created for this AppHost run, then `docker volume rm
     <name>`.
   - docker-compose: no named volume is declared in
     `infra/docker-compose.yml`, so `docker compose down -v` (or simply
     recreating the `postgres` container) is enough.
3. Start AppHost / `docker compose up` again. Both services boot
   against a fully empty database and create their own schema-qualified
   history tables from scratch — no manual SQL needed.

**Option B — you have local data you want to keep:**

Run this once against the shared database (`psql`, pgAdmin, or any
Postgres client), *before* deploying this change's code:

```sql
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS services;

CREATE TABLE identity."__EFMigrationsHistory" (LIKE public."__EFMigrationsHistory" INCLUDING ALL);
CREATE TABLE services."__EFMigrationsHistory" (LIKE public."__EFMigrationsHistory" INCLUDING ALL);

-- Copy each service's own rows by its known migration-id prefixes
-- (see IdentityService.Infrastructure/Persistence/Migrations/ and
-- ServicesService.Infrastructure/Persistence/Migrations/ for the
-- current, authoritative list - update this WHERE clause if new
-- migrations were added since this ADR was written).
INSERT INTO identity."__EFMigrationsHistory"
SELECT * FROM public."__EFMigrationsHistory"
WHERE "MigrationId" IN (
  '20260707181133_InitialCreate',
  '20260707230157_AddTenantIndexes',
  '20260710090630_AddBaseEntityAuditFields',
  '20260710130109_AddDeletedAtIndex'
);

INSERT INTO services."__EFMigrationsHistory"
SELECT * FROM public."__EFMigrationsHistory"
WHERE "MigrationId" IN (
  '20260709180950_InitialCreate',
  '20260710090614_AddBaseEntityAuditFields',
  '20260710130054_AddDeletedAtIndex',
  '20260710132739_AddTenantIdIndex',
  '20260710150255_AddServiceOfferings',
  '20260711172110_RenameServiceOfferingToServiceAndExtend',
  '20260720235529_AddCategoryForeignKeyToService',
  '20260721121859_AddCaseInsensitiveUniquenessAndCategoryLimits'
);

-- Only after confirming both new tables have the expected row counts:
DROP TABLE public."__EFMigrationsHistory";
```

Neither option was executed as part of this change — this repo has no
evidence of a shared/production database (no k8s manifests, no CD
pipeline as of 2026-07, per docs/MONOREPO.md), so this is scoped as a
local-dev operator action, not a production migration. If this is ever
deployed somewhere with a real, already-migrated shared database,
Option B's approach (copy by known migration id, verify row counts,
only then drop the old table) is the safe path — never `DROP` before
verifying the copy.

This does not reopen docs/adr/0002's shared-database-per-service
decision itself, only closes a gap in how completely that decision was
implemented.
