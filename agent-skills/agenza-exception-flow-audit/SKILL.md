---
name: agenza-exception-flow-audit
description: >
  Use to audit throw/try/catch/Exception usage anywhere in backend/ — on
  request, before a release, or whenever a change touches error handling.
  Trigger on "audit exceptions", "review error handling", "check for
  business exceptions", or when reviewing a diff that adds a throw/catch.
  Classifies every occurrence against docs/adr/0012 and docs/adr/0014
  instead of recommending blanket removal — some throws are correct and
  must stay.
---

# Exception Flow Audit

This repo made a deliberate, documented choice (docs/adr/0014, refining
docs/adr/0012 and docs/adr/0005): exceptions are not conventional control
flow for an *expected* outcome, but they are still the right tool for a
genuinely unexpected or unrecoverable failure. This skill's job is
classification, not elimination — recommending "remove every throw" is as
wrong as leaving a business-flow exception in place.

## What to scan

Every `throw`, `try`, `catch`, and reference to `Exception`,
`BusinessException`, `DomainException`, `DuplicateEntityException`,
`DbUpdateException`, `InvalidOperationException`, `NotImplementedException`
under `backend/` (excluding `bin/`, `obj/`). `scripts/architecture_guard.py`
already fails the build on the two patterns that must never exist at all
(`DuplicateEntityException`, `BusinessExceptionHandler`) — this skill
covers everything else, including patterns a regex can't safely judge.

## Classification

For every occurrence, assign exactly one of:

| Classification                              | Meaning                                                                  | Action                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Expected outcome**                         | Validation failure, not-found, conflict/duplicate, in-use, tenant authorization — anything a well-formed client request can legitimately trigger | Must use `Result`/`DomainResult`/`PersistenceResult` instead — flag for fix |
| **Unexpected technical failure**             | Missing startup config, an unrecognized database error, a framework guarantee violated | Exception may stay                                                  |
| **Programming violation**                    | A guard against a state only reachable via an internal bug (e.g. `TenantOwnedEntity.AssignTenant` on an empty guid, `ModelBuilderExtensions`'s reflection guard) | Exception may stay — document why in a one-line comment if not already obvious |
| **Transactional cleanup**                    | A `try/finally` or `try/catch` whose only job is rollback/resource cleanup around an operation whose *business* outcomes already flow through `Result` | May stay — verify the business path itself uses no exceptions, only the cleanup wrapper does |
| **Technical-exception-to-result conversion** | A `catch` at an infrastructure boundary that recognizes a specific provider exception (e.g. Postgres `23505`) and converts it to a typed `PersistenceResult.Failure` | May stay — this is the one legitimate `catch` inside otherwise Result-based flow, and only at the infrastructure boundary, never in a handler |

Known-correct examples already in this codebase (use these as the litmus
test for classification, don't re-flag them): identity-service's
`IUnitOfWork.ExecuteInTransactionAsync` (transactional cleanup),
`ServicesService.Infrastructure/Persistence/UnitOfWork.cs`'s `DbUpdateException`
catch (technical-exception-to-result conversion), `TenantOwnedEntity.AssignTenant`
and `AuditableEntitySaveChangesInterceptor`'s tenant guard (programming
violation), any `?? throw new InvalidOperationException(...)` on missing
startup configuration (unexpected technical failure).

## Output format

A table, one row per occurrence:

| File | Line | Type (`throw`/`try`/`catch`/`Exception` reference) | Purpose (one sentence) | Classification | Recommended action | Justification for keeping (if applicable) |
| --- | --- | --- | --- | --- | --- | --- |

For every row classified **Expected outcome**, describe the fix in terms of
`agent-skills/agenza-backend-use-case`'s decision tree (which layer's
`Result` type should carry this instead, and where the check belongs —
validator vs. handler vs. persistence).

## Explicit non-goals

- Do not recommend removing every `throw` mechanically — a `try/finally`
  around a `SaveChangesAsync` rollback, or a fail-fast startup guard, is
  correct and must stay exactly as-is.
- Do not flag a `catch` at an infrastructure boundary that converts a
  provider exception to a typed result — that conversion is the
  explicitly-allowed pattern (docs/adr/0014), not a violation.
- If a finding would change how an error is reported to a caller (e.g.
  changing an HTTP status code), that's a contract change — flag it for
  `agent-skills/agenza-api-contract-review` too, don't fix it silently.
