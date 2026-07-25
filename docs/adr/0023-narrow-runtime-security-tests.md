# ADR 0023 — Narrow runtime security tests for irreversible boundaries

Status: superseded by ADR 0026 (2026-07)

## Context

ADR 0015 removed Testcontainers and `WebApplicationFactory` projects after
flaky, broad integration suites became expensive to maintain. ADR 0019
restored fast in-memory coverage for two tenant mechanisms, but deliberately
left real PostgreSQL constraints, the migration chain, HTTP authorization,
and tenant header/claim agreement without executable proof.

Those gaps protect the highest-consequence boundary in the application. A
unit-only rule is no longer an acceptable trade-off for them.

## Decision

Add a deliberately small runtime test tier. It may use one PostgreSQL
container per test assembly and an in-process API host. Its scope is limited
to behavior that a unit or in-memory provider cannot prove:

- all migrations apply from an empty PostgreSQL database;
- PostgreSQL rejects a cross-tenant relationship;
- the HTTP boundary rejects missing and mismatched tenant identities;
- a tenant cannot observe, update, or delete another tenant's rows;
- readiness includes the database and identity discovery dependency; and
- a Compose smoke test exercises real client-credentials tokens, scope
  denial, the tenant fail-closed boundary, and authorized provisioning.

The fixture is shared for the assembly, has bounded startup time, and exposes
diagnostic container logs on failure. Ordinary application behavior remains
in unit tests. New runtime tests require a short explanation of why a cheaper
test cannot prove the invariant.

## Fitness functions

- The backend CI job runs the runtime project with Docker available.
- The API-contract CI job runs `scripts/smoke_oidc_contract.py` against the
  real identity and services containers.
- A static migration guard flags newly introduced destructive operations
  unless the migration contains an explicit, reviewed safety marker.
- Runtime tests use unique tenant and entity identifiers and cannot depend on
  execution order.

## Consequences

Backend CI again depends on Docker for this narrow tier. The added cost is
accepted for database and tenant invariants that cannot be simulated
faithfully. This ADR does not restore the removed broad endpoint suites and
does not change the 80% unit-test coverage gate.
