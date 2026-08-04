# ADR 0007 — Direct command binding and operation-local mapping

Status: accepted (2026-07), aligned with the Result-based domain flow from ADR
0014. This document records the current decision only.

## Decision

- API actions bind create/update commands directly instead of declaring local
  body DTOs that duplicate the command shape.
- For update/delete operations, the route id is authoritative. Controllers
  create a command copy with the route id immediately before dispatch.
- Controllers remain limited to authorization, binding, route/body merge,
  dispatch, and shared Result-to-HTTP mapping.
- Command-to-domain construction or mutation may use an operation-local
  extension such as `ToModel` when it makes the handler clearer.
- Mapping extensions return `DomainResult` and do not hide repository calls,
  current-state checks, commits, or error mapping.
- Response mapping lives with the owning feature/contract and does not expose
  persistence entities accidentally.

## Consequences

HTTP and application shapes stay aligned without controller boilerplate.
Handlers retain visible orchestration, while repetitive pure mapping remains
small and independently testable.
