---
name: agenza-exception-flow-audit
description: >
  Use to review throw, try/catch, and Exception usage under backend/. Classifies
  each occurrence against the current Result-based error boundary instead of
  recommending blanket removal.
---

# Exception-flow audit

Read root/backend instructions and inspect each occurrence with its caller and
tests.

## Valid exception uses

- unexpected infrastructure/framework failure;
- programming invariant or impossible state;
- cancellation/rollback/resource cleanup;
- technical exception converted once to `PersistenceResult` or another curated
  boundary result;
- framework-required exception behavior with explicit rationale.

## Invalid uses

- validation, not-found, conflict, in-use, tenant authorization, or another
  expected business outcome;
- domain construction/mutation failure that should return `DomainResult`;
- repository/handler control flow based on catching an expected exception;
- controller-local catches duplicating the global/shared mapper;
- null-forgiving after a lookup that can legitimately miss.

For each occurrence report `file:line | category | expected? | current flow |
finding | fix | test`. Confirm whether a catch preserves cancellation and
whether logs avoid secrets/tenant data. Treat broad catches and swallowed
exceptions as findings only after examining the boundary.
