# ADR 0057 — Services queries default to no tracking

Status: accepted (2026-10); amends [ADR 0049](0049-conventions-for-new-backend-slices.md)

## Context

The services API is read-heavy. EF Core's default query tracking retains objects even when a request
only maps them to a response. Before this decision, only selected pre-checks opted out, while ordinary
reads and a repository method shared by reads and writes could begin tracking implicitly.

## Decision

`ServicesDataContext` is configured with `QueryTrackingBehavior.NoTracking` in both runtime and
design-time options. Direct service repositories inherit that default. The shared repository helper
retains `AsNoTracking()` because it is also used by `identity-service`, which is outside this decision.

A command loads an aggregate through `GetByIdAsync`, applies domain behaviour, then calls its
repository's `UpdateAsync`. The application port describes persistence intent rather than EF tracking.
An EF Core adapter makes the required state changes explicitly inside `UpdateAsync`; another adapter
can persist the same aggregate through its own native mechanism. Ports expose only operations their
handlers currently use.

This decision applies to `services-service`. `identity-service` remains unchanged because ASP.NET
Identity and OpenIddict own query and mutation paths inside their framework stores; changing its
default needs separate framework-level validation.

## Consequences

- Read handlers cannot accidentally retain entity graphs in the change tracker.
- The application depends on aggregate persistence, not on EF tracking semantics.
- The infrastructure chooses and makes explicit the EF state transitions necessary for a mutation.
- The part of ADR 0049 that kept a shared `GetByIdAsync` tracked no longer applies to
  `services-service`.

## Considered and rejected

- **Leaving EF's tracking default enabled and relying on reviewers to add `AsNoTracking`.** An
  omitted call silently costs memory and change detection on every ordinary read.
- **Exposing `GetForUpdateAsync` from the application port.** It makes the caller depend on an
  EF-oriented loading strategy that MongoDB, Cassandra and non-EF SQL adapters do not share.
- **Applying the default to the identity provider immediately.** Its framework stores require their
  own integration validation and are outside this API change.
