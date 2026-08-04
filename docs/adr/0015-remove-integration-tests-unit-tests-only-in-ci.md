# ADR 0015 — Narrow test tiers instead of broad integration suites

Status: accepted (2026-07), narrowed and extended by ADRs 0019 and 0026.
This document records the current decision only.

## Decision

- Domain/Application behavior is covered by fast unit tests and the configured
  coverage gate.
- Tenant-critical EF assignment and query filtering use narrow
  `*PersistenceTests` projects.
- Real PostgreSQL migration/OpenAPI/OIDC/security behavior is exercised by the
  focused AppHost-based contract/runtime smoke in CI.
- Broad Testcontainers or `WebApplicationFactory` suites are not the default.
  Reintroducing one requires an ADR and concrete evidence that existing cheaper
  boundaries cannot prove the invariant.
- A clean-database runtime smoke does not prove existing-data migration safety;
  high-risk transitions require representative-data analysis/dry run.

## Rationale

The previous broad integration tier duplicated unit behavior, was expensive and
flaky, and made failures hard to localize. The current design keeps fast tests
close to business logic while retaining narrow executable proof for persistence
and irreversible runtime boundaries.
