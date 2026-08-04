# ADR 0025 — Explicit database bootstrap

Status: accepted for explicit opt-in bootstrap; advisory-lock serialization was
superseded by ADR 0027 (2026-07).

## Decision

- Base configuration keeps `DatabaseBootstrap:RunOnStartup=false`.
- Development may enable startup migration/seed explicitly for the single
  local-demo instance of each service.
- The current demo does not support concurrent bootstrap writers.
- A future multi-replica deployment must run migration/seed once as a separate
  privileged deployment step, then start application replicas with startup
  bootstrap disabled.
- Seed behavior remains idempotent under database constraints.

App startup is not the production migration strategy. The repository has no
production deployment design yet.
