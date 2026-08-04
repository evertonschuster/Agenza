# ADR 0012 — State checks in handlers; invariants in Domain

Status: accepted (2026-07), with exception-based domain outcomes replaced by
`DomainResult` in ADR 0014. This document records the current decision only.

## Decision

- FluentValidation performs synchronous request-shape checks only.
- Handlers perform existence, uniqueness pre-checks, in-use checks, and other
  decisions requiring repositories or another aggregate.
- Domain factories and mutation methods enforce permanent invariants and return
  `DomainResult` before mutation.
- Database constraints remain the race-safe authority. Recognized provider
  conflicts are converted at the infrastructure boundary and mapped explicitly
  by Application.
- Not-found, conflict, validation, and in-use outcomes preserve distinct stable
  application/HTTP error codes.

## Rationale

This keeps validators deterministic and framework/persistence-light, keeps
current-state orchestration in Application, and preserves domain integrity for
all callers without returning to expected-outcome exceptions.
