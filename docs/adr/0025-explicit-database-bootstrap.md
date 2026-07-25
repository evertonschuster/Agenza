# ADR 0025 — Explicit and serialized database bootstrap

Status: superseded in part by ADR 0027 (2026-07); bootstrap remains explicit
and disabled by default, but is no longer serialized by an advisory lock

## Context

Both APIs can apply migrations and seed data during ordinary process startup.
The behavior is enabled by default. Multiple replicas can therefore race on
schema changes and on check-then-insert seed operations, while a runtime
service account needs more database privilege than the steady-state
application requires.

The repository is currently a demo and has no production deployment path,
but its runtime defaults should still make the safe operational boundary
clear.

## Decision

Automatic migrations and seed data are disabled in base configuration and
enabled only by `appsettings.Development.json` or an explicit environment
override. When enabled, bootstrap is serialized with a PostgreSQL advisory
lock held for the complete migration/seed window.

The Development environment may opt in explicitly. A future deployment must run
the same migration chain as a one-shot bootstrap using an appropriately
privileged identity before starting replicas; designing that deployment is
outside this ADR and outside the current demo scope.

Seed operations remain idempotent under database constraints and execute
while the service-specific advisory lock is held, so replicas cannot race
through the existing check-then-insert sequence.

## Fitness functions

- A configuration test proves base settings do not enable migration or seed.
- Development settings opt in deliberately.
- The Aspire API-contract job starts from a fresh PostgreSQL database and
  therefore exercises the complete migration chain during service startup.
- The architecture guard rejects a base configuration that silently turns
  automatic bootstrap back on.

## Consequences

Local development behavior remains automatic. Running an API with only base
configuration now requires the database to have been bootstrapped explicitly.
ADR 0027 later removes advisory-lock serialization for the single-instance
demo and intentionally leaves concurrent startup unsupported.
This change does not create certificates, deployment automation, or a
production frontend image.
