# ADR 0026 — Remove the dedicated runtime-test project

Status: accepted (2026-07); supersedes ADR 0023

## Context

`ServicesService.RuntimeTests` duplicated part of the real Aspire runtime with
Testcontainers, an in-process API host, role setup, and test authentication.
That maintenance cost was not justified for the current demo.

## Decision

Remove the dedicated runtime-test project and its test-only API seam. Keep the
smallest test tier that proves each boundary:

- Domain and Application unit tests with their coverage gate;
- `ServicesService.PersistenceTests` for tenant assignment, soft deletion, and
  tenant query filtering;
- architecture guards for project, migration, bootstrap, and tenant rules; and
- the Aspire API-contract job for fresh PostgreSQL startup, readiness, and real
  OIDC/API smoke behavior.

A new database-backed runtime tier requires a concrete invariant that cheaper
checks cannot prove, observed failure evidence, and an ADR defining its scope
and operational budget.

## Accepted gaps

There is no direct automated proof of cross-schema role denial, real
PostgreSQL composite-tenant constraint rejection, cross-tenant HTTP mutation,
or unique-constraint race translation. Changes in those areas require focused
review and manual verification until a narrow automated test is justified.
Concurrent startup bootstrap is intentionally unsupported by ADR 0027.
