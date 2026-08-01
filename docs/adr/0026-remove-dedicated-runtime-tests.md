# ADR 0026 — Remove the dedicated runtime-test project

Status: accepted (2026-07); supersedes ADR 0023

## Context

ADR 0023 added `ServicesService.RuntimeTests` to verify selected PostgreSQL
and HTTP security boundaries with Testcontainers and
`WebApplicationFactory`. The project required a shared PostgreSQL fixture,
service-role setup, an in-process API factory, and a test authentication
handler.

For the current demo, that additional test runtime and maintenance surface
is not justified. The repository already has an API-contract job that
starts the real application resource graph. It can retain the highest-value
system smoke without keeping a second runtime harness inside the backend
solution.

## Decision

Delete `ServicesService.RuntimeTests` and its Testcontainers,
`WebApplicationFactory`, and direct Npgsql package dependencies. Remove the
test-only public `Program` seam from the services API.

Keep these automated checks:

- `*.Tests` projects enforce 80% Domain + Application line coverage;
- `ServicesService.PersistenceTests` verifies automatic tenant assignment,
  soft deletion, and tenant query filtering with EF InMemory;
- the API-contract Aspire job starts from a fresh PostgreSQL database,
  applies the full migration chain, checks readiness, and runs
  `scripts/smoke_oidc_contract.py`;
- the OIDC smoke checks client credentials, wrong-scope denial, missing
  tenant fail-closed behavior, and authorized tenant provisioning; and
- architecture guards reject destructive migrations, unsafe base bootstrap
  configuration, and invalid project references.

Do not recreate a database-backed test project speculatively. A future
runtime tier requires concrete failure evidence, a narrow invariant that
cheaper tests cannot prove, and an ADR defining its operational budget and
exit criteria.

## Fitness functions

- `AdminBackend.slnx` contains no `RuntimeTests` project.
- central package management contains no `Testcontainers.PostgreSql` or
  `Microsoft.AspNetCore.Mvc.Testing` dependency.
- backend CI runs unit and Docker-free EF persistence tests.
- the API-contract CI job runs the AppHost graph and the real
  OIDC smoke.

## Consequences

The backend solution is simpler and its test phase does not start a database
container or in-process web host. The separate API-contract job exercises
Aspire's PostgreSQL, identity, and services resources. ADR 0029 later removed
the parallel Compose graph and application image builds.

The following behaviors no longer have a direct automated proof:

- service-role and cross-schema privilege enforcement;
- PostgreSQL rejection of cross-tenant foreign-key relationships;
- cross-tenant update and delete attempts through the HTTP API; and
- database-level translation of a real PostgreSQL unique-constraint race.

Concurrent bootstrap is not merely untested: it is intentionally unsupported
after ADR 0027.

These are accepted, visible risks for the current demo. Changes touching
them require focused review and manual verification until observed failures
justify a smaller automated replacement.
