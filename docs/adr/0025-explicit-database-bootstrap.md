# ADR 0025 — Explicit and serialized database bootstrap

Status: accepted (2026-07)

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

The demo Compose stack may opt in explicitly. A future deployment must run
the same migration chain as a one-shot bootstrap using an appropriately
privileged identity before starting replicas; designing that deployment is
outside this ADR and outside the current demo scope.

Seed operations remain idempotent under database constraints and execute
while the service-specific advisory lock is held, so replicas cannot race
through the existing check-then-insert sequence.

## Fitness functions

- A configuration test proves base settings do not enable migration or seed.
- Development settings and the demo Compose stack opt in deliberately.
- Runtime tests exercise bootstrap against PostgreSQL and prove a second
  replica cannot acquire the same advisory lock until the first releases it.
- The architecture guard rejects a base configuration that silently turns
  automatic bootstrap back on.

## Consequences

Local development behavior remains automatic. Running an API with only base
configuration now requires the database to have been bootstrapped explicitly.
This change does not create certificates, deployment automation, or a
production frontend image.
