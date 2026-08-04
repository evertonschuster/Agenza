# ADR 0005 — CQRS vertical slices and Result-based application flow

Status: accepted (2026-07), amended by ADRs 0012, 0014, 0015, and 0018.
This document records the current decision only.

## Context

Backend business behavior needs explicit boundaries without MediatR or
exception-driven control flow. Services must remain small context-owned
applications whose operations are easy to locate, test, and expose through HTTP.

## Decision

- Commands and queries implement the shared CQRS interfaces and are dispatched
  by `Admin.SharedKernel`.
- Business operations live as vertical slices under
  `Application/<Feature>/<Operation>/`.
- Handlers and validators are discovered by assembly scanning; they are not
  registered one by one.
- Application handlers return `Result` values. Domain factories and mutations
  return `DomainResult`; recognized persistence conflicts return
  `PersistenceResult` and are mapped by Application.
- FluentValidation owns synchronous request shape. Handlers own current-state
  and cross-aggregate checks. Domain owns permanent invariants. Database
  constraints own race-safe integrity.
- Repositories stage changes. A service-local unit of work commits the operation
  at the application boundary.
- Controllers bind/merge route data, dispatch, and map Result to HTTP through
  `Admin.SharedKernel.AspNetCore`; they do not own business logic.
- A feature normally belongs to the existing owning context. New services are
  justified by business-context ownership, not by entity count.

## Dependency direction

```text
Domain <- Application <- Infrastructure
                    \<- Api composition
```

`Admin.SharedKernel` remains framework-agnostic. ASP.NET Core mappings and the
global technical exception handler live in `Admin.SharedKernel.AspNetCore`.

## Consequences

- Expected validation, not-found, conflict, in-use, and authorization outcomes
  are explicit values and are testable without HTTP hosting.
- Domain and Application remain independent of EF Core and ASP.NET Core.
- Technical failures may still throw until converted once at the appropriate
  infrastructure/global boundary.
- Boundary-specific test tiers are defined by current solution/config and
  `docs/QUALITY.md`, not by historical examples.
