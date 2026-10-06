# ADR 0057 — Services queries default to no tracking

Status: accepted (2026-10); amends [ADR 0049](0049-conventions-for-new-backend-slices.md)

## Context

The services API is read-heavy. EF Core's default query tracking retains objects even when a request
only maps them to a response. Before this decision, only selected pre-checks opted out, while ordinary
reads and a repository method shared by reads and writes could begin tracking implicitly.

## Decision

`ServicesDataContext` is configured with `QueryTrackingBehavior.NoTracking` in both runtime and
design-time options. Repository reads also use `AsNoTracking()` explicitly.

A command that changes or removes an aggregate must request it through `GetForUpdateAsync`; that
method uses `AsTracking()` explicitly. A tracked tag lookup used to change a service's tag association
is named `GetByIdsForUpdateAsync` for the same reason. Ports expose only operations their handlers
currently use.

This decision applies to `services-service`. `identity-service` remains unchanged because ASP.NET
Identity and OpenIddict own query and mutation paths inside their framework stores; changing its
default needs separate framework-level validation.

## Consequences

- Read handlers cannot accidentally retain entity graphs in the change tracker.
- A mutation's dependency on EF tracking is visible at its repository call site.
- The part of ADR 0049 that kept a shared `GetByIdAsync` tracked no longer applies to
  `services-service`.

## Considered and rejected

- **Leaving EF's tracking default enabled and relying on reviewers to add `AsNoTracking`.** An
  omitted call silently costs memory and change detection on every ordinary read.
- **A second method differing only by tracking without an intention-revealing name.** It conceals
  whether the caller is reading or preparing a mutation.
- **Applying the default to the identity provider immediately.** Its framework stores require their
  own integration validation and are outside this API change.
