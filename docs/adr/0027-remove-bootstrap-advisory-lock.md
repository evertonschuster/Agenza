# ADR 0027 — Remove the bootstrap advisory lock from the demo

Status: accepted (2026-07); supersedes the serialization portion of ADR 0025

## Context

ADR 0025 introduced a PostgreSQL session-level advisory lock around each
service's migration and seed window. It prevents two replicas of the same
service from bootstrapping the database concurrently.

The repository is a demo with no production deployment path and runs one
instance of each service. Base configuration already disables startup
bootstrap, while Development and the demo Compose stack opt in explicitly.
The lock therefore protects a multi-replica topology that does not exist,
adds PostgreSQL-specific shared code, and holds a connection open for the
complete bootstrap window.

## Decision

Delete `PostgresAdvisoryLock`. When
`DatabaseBootstrap:RunOnStartup=true`, each service directly runs its
migrations and identity-service then runs its idempotent development seed.

The supported demo topology has at most one bootstrap-enabled instance of
each service. Starting concurrent bootstrap writers is intentionally
unsupported.

A future multi-replica deployment must not solve this by enabling bootstrap
on every application replica. It must run migrations and seed once, as a
separate deployment step or one-shot process, before starting replicas with
startup bootstrap disabled.

## Fitness functions

- base application settings keep `DatabaseBootstrap:RunOnStartup=false`;
- Development and the demo Compose stack are the only intentional startup
  opt-ins;
- the architecture guard rejects reintroduction of
  `PostgresAdvisoryLock`/`pg_advisory_lock` without a new decision; and
- the Compose API-contract job starts from an empty database and proves the
  single-instance bootstrap path still reaches readiness.

## Consequences

Bootstrap code is smaller and no longer depends on a session-level
distributed lock. Local development and the demo Compose flow retain their
existing migration and seed behavior.

If two bootstrap-enabled instances of the same service start concurrently,
EF migrations or check-then-insert seed operations may conflict. This is an
accepted limitation of the current demo. Evidence of multiple replicas, a
deployment design, or an observed startup race reopens the decision and
triggers a one-shot bootstrap design.
