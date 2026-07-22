# ADR 0015 — Remove integration tests; CI runs unit tests only

Status: accepted (2026-07); supersedes the integration-test-tier passages
of docs/adr/0005 and docs/adr/0008

## Context

Since ADR 0006, `backend-ci.yml`'s `Test (unit + integration)` step ran
both `*.Tests` (unit, NSubstitute mocks, no external dependencies) and
`*.IntegrationTests` (`WebApplicationFactory` + Testcontainers, a real
Postgres container per test class) in the same `dotnet test` invocation.
Both services' `*.IntegrationTests` projects together spun up **five to
seven concurrent Postgres containers** (`ServicesApiFactory` shared by
three endpoint-test classes, `MigrationDataSafetyTests`,
`MigrationsRunOnStartupTests`, `UnitOfWorkTests`, and identity-service's
`IdentityApiFactory`) under xUnit's default test-collection parallelism.

This became unreliable on GitHub Actions' shared runners specifically —
`backend-build-and-test` failed 3 times in a row on the same PR, each
time a *different* test class the victim, always with the same
signature (`Npgsql.NpgsqlException`, `Connection reset by peer` /
`unexpected EOF` during container startup), never a real assertion
failure. Grouping the affected classes into a single xUnit
`[Collection("Postgres", DisableParallelization = true)]` (forcing them
to run one at a time) was evaluated as a fix, but the underlying
decision was reconsidered instead: a CI pipeline depending on a
database at all — needing Docker, needing multiple containers to start
reliably, needing collection-parallelism tuning to stay green — is more
operational surface than a "does this compile and pass its unit tests"
gate needs to carry.

## Decision

Delete both `*.IntegrationTests` projects
(`ServicesService.IntegrationTests`, `IdentityService.IntegrationTests`)
entirely — not disable them, not exempt them from a required check, not
tune xUnit parallelism to make them reliable. CI (`backend-ci.yml`) runs
`*.Tests` projects only: no Postgres, no Docker, no
`WebApplicationFactory`, no Testcontainers.

Two EF Core `UseInMemoryDatabase`-based test classes
(`AuditableEntitySaveChangesInterceptorTests`,
`ServicesDataContextTenantScopingTests`) lived in the deleted
`ServicesService.IntegrationTests` project despite having zero external
dependencies — they were evaluated for a move into `ServicesService.Tests`
but deliberately left out: `*.Tests` projects reference only Domain +
Application (mocked ports), and giving them an EF Core /
`ServicesService.Infrastructure` dependency to house two tests would
blur that boundary for the whole project going forward, not just add a
one-off exception. The coverage they provided (automatic tenant
assignment on save per docs/adr/0008, tenant-scoped query-filter
isolation per docs/adr/0006) has no automated replacement — see
"Consequences" below.

### What's removed, package-by-package

- `backend/services/services-service/ServicesService.IntegrationTests/`
  and `backend/services/identity-service/IdentityService.IntegrationTests/`
  — deleted entirely.
- `AdminBackend.slnx` — both project references removed.
- `Directory.Packages.props` — `Testcontainers.PostgreSql`,
  `Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.EntityFrameworkCore.InMemory`
  removed (nothing else referenced them).
- `Directory.Build.props`/`.targets` — the `.IntegrationTests`-exclusion
  conditions on the coverage gate simplified away (vacuously true once
  the projects don't exist, but misleading to leave as dead logic).
- `backend-ci.yml` — the `Test (unit + integration)` step's name and
  comment updated; the `dotnet test` invocation itself needed no change
  (it already just runs whatever's in the solution).
- Both `Api/Program.cs` files — the now-pointless `public partial class
  Program;` (which existed solely to let `WebApplicationFactory<Program>`
  construct the host in tests) removed along with its comment.

## Consequences

**What's gained**: `backend-build-and-test` no longer needs Docker at
all, cannot fail on container-startup contention, and runs in roughly a
third of the previous wall-clock time (unit tests alone, no container
boot). The two SKILL.md how-to guides (`backend-new-microservice`,
`backend-use-case`) that walked through building a new
`<Service>.IntegrationTests` project, a `TestAuthHandler`, and the
`WidgetApiFactory`/`WidgetsEndpointTests` pattern are rewritten to say
so explicitly instead of teaching a pattern this repo no longer uses.

**What's lost, with no automated replacement**:

- End-to-end HTTP coverage of every controller (auth challenges 401/403,
  request→response shape, status codes) — previously
  `TagsEndpointTests`/`CategoriesEndpointTests`/`ServicesEndpointTests`/
  `ProvisioningEndpointTests`.
- The database-level case-insensitive unique-constraint race proof
  (docs/adr/0012) — a `PersistenceResult.Failure` from a genuine
  concurrent Postgres `unique_violation` is still exercised by
  `ServicesService.Application`'s handler-level unit tests via a
  mocked `IUnitOfWork`, but nothing exercises the real
  `UnitOfWork`/`DbUpdateException`/`PostgresException` translation path
  against a real database anymore.
- Migration safety (`MigrationDataSafetyTests`,
  `MigrationsRunOnStartupTests`) — that a migration shrinking a column
  fails loudly against real pre-existing data, and that
  `Migrations:RunOnStartup=false` genuinely skips migrating.
- Automatic tenant assignment on save and tenant-scoped query-filter
  isolation (docs/adr/0008, docs/adr/0006) — both were EF-InMemory-only
  and could have stayed, but were deliberately left out (see Decision).
- The OAuth/OIDC token-exchange flows (`ProvisioningEndpointTests`'s
  client-credentials grant, wrong-secret rejection, scope enforcement) —
  and identity-service's rollback-on-failure transaction behavior
  (`ExecuteInTransactionAsync`, docs/adr/0005) — no longer has an
  automated proof that a failed owner-creation actually rolls back the
  tenant row.

Every one of the above is now a **manual verification step** before
merging a change that touches it — both SKILL.md files say so at the
point a workflow used to point at an integration test. This is a
deliberate trade of automated regression coverage for CI simplicity and
reliability; if a specific class of manual-only verification proves to
be missed too often in practice, re-introducing narrow coverage for
that one thing (not the whole tier) is the way to revisit this, not
reverting to Testcontainers wholesale.

This does not reopen docs/adr/0005's CQRS/Result-pattern decision,
docs/adr/0006's tenant-header/`BaseEntity` mechanism, docs/adr/0008/0009's
automatic tenant-assignment mechanism itself (only its test coverage),
or docs/adr/0014's Domain/persistence Result-pattern work — none of the
production code those ADRs describe changed here, only what verifies it
in CI.
