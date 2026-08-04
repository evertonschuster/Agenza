# ADR 0014 — Result values across Domain, Application, and persistence

Status: accepted (2026-07). This document records the current decision only.

## Context

Expected business failures previously crossed boundaries through custom
exceptions. That obscured signatures, encouraged broad catches, and mixed
business outcomes with technical failures.

## Decision

- Domain factories and behavior methods return `DomainResult` for invalid
  values or transitions and validate before mutation.
- Application commands/queries return `Result` and map domain failures to stable
  application error codes.
- Infrastructure converts recognized database constraint/concurrency conflicts
  to `PersistenceResult`; Application decides their business meaning.
- Controllers map Result values through shared ASP.NET Core extensions.
- Exceptions remain valid only for unexpected technical failures, programming
  violations/impossible states, cancellation/cleanup, and the narrow boundary
  where a technical exception is converted to a result.
- No expected validation, not-found, conflict, in-use, tenant authorization, or
  malformed external payload outcome uses throw/catch control flow.

## Mutation safety

A domain mutation validates every proposed value first. On failure, the entity
remains unchanged. Audit and tenant assignment stay persistence concerns.

## Consequences

- Expected error behavior is visible in method signatures and tests.
- Global exception handling remains a final technical safety net, not the normal
  business path.
- Callers must map every reachable failure explicitly rather than suppressing a
  missing result with null-forgiving or broad catch logic.
