# ADR 0019 — Narrow EF InMemory tests for tenant isolation, without reopening docs/adr/0015

Status: accepted (2026-07); complemented by the PostgreSQL runtime tier in ADR 0023

## Context

docs/adr/0015 deleted both services' `*.IntegrationTests` projects entirely
because their Postgres Testcontainers were flaking on shared CI runners.
That decision was correct for everything Testcontainers-backed. But two
test classes living in the deleted `ServicesService.IntegrationTests`
project had **zero external dependencies** — `AuditableEntitySaveChangesInterceptorTests`
and `ServicesDataContextTenantScopingTests` both ran against
`UseInMemoryDatabase`, no Postgres, no Docker. docs/adr/0015 evaluated
moving them into `ServicesService.Tests` and deliberately chose not to,
to avoid giving `*.Tests` (Domain + Application only, mocked ports) an
EF Core / `ServicesService.Infrastructure` dependency for the sake of two
tests. The result: automatic tenant assignment on save (docs/adr/0008)
and the tenant-scoped query filter (docs/adr/0006) — the mechanisms
behind this repo's #1 non-negotiable (root `AGENTS.md`'s tenant-scoping
rule) — had no automated regression coverage at all, only the
manual-verification step docs/adr/0015 asks for before merging a change
that touches them.

Weighed against what those two tests actually cost (no Docker, no
network, sub-second), the *.Tests-boundary purity docs/adr/0015 optimized
for here isn't worth leaving the highest-consequence invariant in the
codebase with zero automated proof.

## Decision

Add `ServicesService.PersistenceTests`, a new project deliberately
**outside** `ServicesService.Tests` and its Domain+Application-only
boundary:

- References `ServicesService.Infrastructure` (and transitively
  `Admin.Identity.Client`, `Admin.SharedKernel.EntityFrameworkCore`) —
  the one thing `ServicesService.Tests` still never does.
- `Microsoft.EntityFrameworkCore.InMemory` only. No Postgres, no Docker,
  no `WebApplicationFactory`, no Testcontainers — docs/adr/0015's actual
  decision (CI needs no database) is unchanged.
- Named without a `.Tests` suffix on purpose:
  `Directory.Build.props`'s 80%-line-coverage gate triggers on
  `MSBuildProjectName.EndsWith('.Tests')`. This project's two test
  classes intentionally exercise only
  `AuditableEntitySaveChangesInterceptor` and `ServicesDataContext`'s
  query filter, not the rest of `ServicesService.Infrastructure`
  (repositories, `ServiceCodeGenerator`, `UnitOfWork`, EF
  configurations/migrations) — gating it at 80% of that whole assembly
  would fail regardless of how well the two mechanisms it targets are
  covered, and would pressure whoever hits that failure to pad coverage
  with tests unrelated to what this project exists for. It runs in
  `dotnet test backend/AdminBackend.slnx` like every other test project;
  it's just outside the coverage-gate convention, not outside CI.
- `AuditableEntitySaveChangesInterceptorTests`: new tenant-owned entity
  gets `AssignTenant` called automatically from `ICurrentTenantProvider`;
  saving with no tenant available throws instead of persisting a
  tenant-less row; `MarkCreated`/audit stamping on add; `Remove()` turns
  into a soft delete instead of an actual row delete.
- `ServicesDataContextTenantScopingTests`: a query only returns the
  current tenant's rows; soft-deleted rows stay hidden; **two separate
  `DbContext` instances of the same type, each constructed for a
  different tenant, opened back to back against the same InMemory
  database never leak a row across tenants** — this is the exact
  scenario `Admin.SharedKernel.EntityFrameworkCore/ModelBuilderExtensions.cs`'s
  `BuildFilter` comment and docs/adr/0006 describe (EF Core caches the
  compiled model per `DbContext` *type*; a naively-captured constant
  tenant id would leak across every subsequent request).

## What this does not change

- docs/adr/0015's actual decision — CI still runs no database, no
  Docker, no Testcontainers, no `WebApplicationFactory`. This ADR adds
  one narrowly-scoped InMemory project for two specific mechanisms, not
  a database-backed test tier.
- Every other item docs/adr/0015 lists under "What's lost, with no
  automated replacement" (endpoint-level HTTP coverage, the real
  Postgres unique-constraint race, migration safety, OIDC token-exchange
  flows, identity-service's transaction rollback) is still exactly that —
  lost, manual-verification-only, unchanged by this ADR. Re-introducing
  coverage for any of those, if a gap there proves costly in practice, is
  its own future decision, evaluated the same way this one was: what the
  specific coverage is worth against what it costs to keep green in CI —
  not a reason to reopen docs/adr/0015 wholesale.
- identity-service has no equivalent project yet. Its
  `AuditableEntitySaveChangesInterceptor` stamps audit fields the same
  way, but it has no tenant-scoped entities of its own (`TenantHeaderFilter`
  is wired into services-service's `Program.cs` only, per docs/adr/0006) —
  the tenant-scoping half of this ADR doesn't apply there. If
  identity-service later needs the same audit-stamping coverage, mirror
  this project's shape rather than sharing one across services (services
  don't share a database access layer, docs/adr/0001).

## Consequences

- `dotnet test backend/AdminBackend.slnx` now also runs
  `ServicesService.PersistenceTests` — still no Docker, no Postgres,
  sub-second wall-clock (confirmed: 7 tests, ~2s).
- A future change to `AuditableEntitySaveChangesInterceptor`,
  `ApplyAuditableConventions`, or `ServicesDataContext`'s tenant wiring
  that breaks automatic tenant assignment or cross-tenant isolation now
  fails CI instead of depending on a reviewer catching it by hand.
- `backend/AGENTS.md`'s "No integration tests, by decision (docs/adr/0015)"
  passage is updated to point here for the two mechanisms this project
  covers, instead of reading as a blanket "verify manually" for tenant
  scoping specifically.
