# ADR 0090 — Prove tenant isolation in the existing Aspire job

Status: accepted (2026-11); narrows the manual verification policy of
[ADR 0026](0026-remove-dedicated-runtime-tests.md).

## Context

The API-contract job already runs the real Identity and Services hosts with
PostgreSQL. The OIDC smoke exercises a token without a tenant. It cannot
show what happens when an authenticated owner supplies their own valid
tenant context and the ID of a person from another tenant.

[ADR 0089](0089-clients-tags.md) records manual verification of the two
tenant-composite foreign keys on `ClientTags`. EF InMemory tests can inspect
relational metadata. PostgreSQL must execute the constraints to prove
enforcement.

## Decision

Use the database and browser already started by
[`api-contract-check`](../../.github/workflows/frontend-ci.yml) for two
checks:

- [HTTP isolation](../../apps/admin-frontend/e2e/tenant-isolation.spec.ts).
  Sign in as two real owners and create one person in each tenant with a
  shared search term. The second owner's matching page contains only their
  own person and reports a total of one. Their GET, PUT and DELETE against
  the first owner's person return `404 Client.NotFound`. Using the first
  owner's tenant header returns `403 Tenant.ContextMismatch`. The first
  owner can still read the person with the original name.
- [Relational isolation](../../scripts/smoke_tenant_foreign_keys.sql).
  As `services_app`, insert a valid client-tag link and try a link crossing
  each foreign key in turn. Each attempt must fail with a foreign-key
  violation from the expected constraint. Roll back all fixtures.

The HTTP scenario provisions a synthetic tenant and runs only when the
caller opts in with `AGENZA_DISPOSABLE_TEST_DB=1` against a disposable stack.
The GitHub-hosted job provides that stack. The browser scenario uses the
existing single worker and test timeout. The SQL step has a one-minute
budget, with shorter database lock and statement timeouts. A failed
assertion fails the existing job.

## Trade-offs and scope

Continuing manual verification avoids additional runtime checks. It leaves
both boundaries untested on routine changes. A separate runtime test project
would repeat database startup and authentication setup, the cost that
[ADR 0015](0015-remove-integration-tests-unit-tests-only-in-ci.md) and ADR
0026 removed. The checks here reuse the existing job and its dependencies.

The checks cover one HTTP resource and the two `ClientTags` foreign keys.
Schema privileges, other constraints and translation of a real concurrent
uniqueness violation remain manual. Two requests returning `201` and
`409` could exercise the application precheck alone. Automating that race
requires a way to prove both writes reached PostgreSQL.

The Services owners investigate failures before merge. Revisit the checks
if they repeatedly exhaust their budget or if a change removes the
underlying tenant boundary. Reverting this change restores the manual
verification policy for these scenarios.
