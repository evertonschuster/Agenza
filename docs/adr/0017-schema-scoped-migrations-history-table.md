# ADR 0017 — Schema-scoped `__EFMigrationsHistory` per service

Status: accepted (2026-07); the schema-scoped history decision remains
current. ADR 0028 replaced the migration IDs and supersedes this ADR's
original local volume reset runbook.

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
`DatabaseBootstrap:RunOnStartup`) and the Aspire `AppHost`
(`.WithDataVolume()` on the Postgres resource) starts both services
against the same database. On a fresh database this is
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
`public.__EFMigrationsHistory` — which is the _normal_ state of any
local dev environment that has run
`dotnet run --project backend/AppHost` at least once, since Aspire's
Postgres resource uses `.WithDataVolume()` (a persistent named volume)
— the next `MigrateAsync()` call per service will look for its history
in the new schema-qualified table, find nothing, and attempt to
re-apply every migration from scratch, including `CREATE TABLE`
statements for tables that already exist. This fails loudly
(`42P07 relation already exists`) rather than silently corrupting data,
but it does break local dev startup until handled. This is exactly the
kind of change `.agents/skills/agenza-migration-safety` and root
`AGENTS.md`'s question policy require flagging rather than executing
unattended — no docker/psql command was run as part of this change.

### Superseded local runbook

ADR 0028 intentionally deleted the migration IDs this ADR originally moved.
Do not copy those historical rows into the current history tables. Existing
local databases must now be backed up if necessary and recreated from an
empty volume using the current runbook in `docs/MONOREPO.md`.

This does not reopen docs/adr/0002's shared-database-per-service
decision itself, only closes a gap in how completely that decision was
implemented.
