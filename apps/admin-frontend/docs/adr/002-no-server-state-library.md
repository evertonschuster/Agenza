# ADR 002 — No server-state library

**Status:** Accepted

## Decision

Use plain `useAsync` hook + repository calls instead of TanStack Query,
SWR, or similar.

## Rationale

Explicit project constraint. Most state here is server data scoped by
tenant — no complex shared client state, optimistic updates, or advanced
caching requirements in v1. `useAsync` provides a consistent
loading/data/error pattern without external dependencies.

## Consequences

- Every feature hook (useServices, useAppointments, etc.) is built on
  `useAsync` — consistent pattern, no per-screen reinvention
- No automatic background refetching or cache invalidation in v1
- If caching requirements grow, migrate to TanStack Query at that point
