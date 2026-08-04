# ADR 0019 — Narrow persistence tests for tenant-critical EF behavior

Status: accepted (2026-07).

## Decision

Maintain focused `*PersistenceTests` projects for behavior that unit tests or
mocked repositories cannot prove reliably:

- save-interceptor tenant assignment and fail-closed behavior;
- global tenant query filtering using the live DbContext context;
- tenant-aware indexes/relationships when provider-independent proof is useful;
- regressions caused by EF model configuration rather than business handlers.

These tests use the lightest current provider/fixture that proves the mechanism.
Real PostgreSQL migration, constraint, OpenAPI, and OIDC behavior remains in the
focused AppHost runtime/contract smoke described by ADR 0026 and
`docs/QUALITY.md`.

## Boundaries

- Do not duplicate ordinary handler/domain cases in PersistenceTests.
- Add a persistence test when a change touches assignment, filters, model
  capture, tenant indexes, or tenant-aware relationships.
- A provider-light test is not proof of PostgreSQL-specific migration behavior;
  use the runtime gate or a representative-data dry run where required.
