# ADR 003 — Manual dependency injection, no container library

**Status:** Accepted

## Decision

Use a manual composition root (`createAppContainer()`) instead of a DI
container library (InversifyJS, tsyringe, etc.).

## Rationale

The dependency graph is simple and static. A DI library would add
decorators (which conflict with `erasableSyntaxOnly`) and indirection
without meaningful benefit at this project's scale.

## Consequences

- `composition/container.ts` is the only file that imports concrete
  implementations — every other file depends on interfaces
- Adding a new use case means manually wiring it in the container
- Scaling beyond ~10 repositories would warrant reconsidering
