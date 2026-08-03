---
name: agenza-backend-use-case
description: >
  Use whenever adding or changing business logic in a .NET service under
  backend/, including commands, queries, entities, value objects, repository
  methods, endpoints, validators, or vertical slices. Trigger on "add
  endpoint", "implement operation", "create entity", "command", "query",
  "handler", or "validator". Enforces this repository's CQRS, Result flow,
  rich-domain, tenant-safety, persistence, and test conventions and prevents
  reintroducing the exception- and validator-based patterns reverted by ADRs
  0012 and 0014.
---

# Backend use case

Before writing code, inspect the closest production slice and its tests. Use
compiled code, the current solution, and generated contracts as templates;
never copy a full implementation from prose. Read `backend/AGENTS.md` and only
the ADRs routed by `docs/adr/README.md` for the affected concern.

## Put each rule in one layer

| Rule | Owner |
| --- | --- |
| Request shape, required fields, format, range, cross-field input comparison | Synchronous FluentValidation validator |
| Existence, uniqueness pre-check, in-use state, another aggregate | Handler |
| Permanent entity/value-object invariant | Domain factory or mutation returning `DomainResult` |
| Race-safe uniqueness and relational integrity | Database constraint plus `PersistenceResult` mapping |
| Unexpected or unrecoverable technical failure | Exception |

Expected validation, not-found, conflict, in-use, and authorization outcomes
never throw. Do not inject repositories into validators, use repository-backed
`MustAsync`/`CustomAsync`, add business-exception types or handlers, catch an
expected outcome in a handler, or use `!` after a lookup that can be absent.

## Build the smallest vertical slice

1. **Domain.** Tenant-owned entities inherit the service's
   `TenantOwnedEntity`; tenant-free entities inherit `BaseEntity`. Keep setters
   private. Factories and state changes validate invariants before mutation and
   return `DomainResult`; audit fields and tenant assignment remain framework
   responsibilities.
2. **Port.** Add a narrow intent-revealing interface under
   `Application/Abstractions`. Repository methods do not accept a tenant id;
   the live `DbContext` applies tenant filtering. `Add` and `Remove` stage work
   and do not commit internally.
3. **Slice.** Put the command/query, synchronous validator, handler, and any
   operation-specific mapping under `Application/<Feature>/<Operation>/`.
   Application depends only on ports and domain types. Use an operation mapping
   extension when command-to-domain construction or mutation would otherwise
   obscure the handler.
4. **Handler.** Check not-found and conflicts before mutation, map domain
   failures explicitly, stage persistence, commit through the service's
   `IUnitOfWork`, and map recognized persistence conflicts to application
   errors. Use a transaction only when multiple writes must succeed together.
5. **Infrastructure.** Implement the port with the shared repository base and
   auditable conventions. Do not add tenant or soft-delete query filters by
   hand. Add tenant-scoped indexes and foreign keys where the business rule
   requires them. Any schema change also triggers
   `.agents/skills/agenza-migration-safety`.
6. **API.** Keep controllers thin: authorize by default, bind the command or
   query directly, merge route ids immediately before dispatch, and use the
   shared Result-to-HTTP mapper. `[IgnoreTenant]` requires a genuinely
   tenant-free operation. Do not add local body DTOs that duplicate the
   command or catch business exceptions.

Create a new service only for a justified business context and follow
`.agents/skills/agenza-backend-new-service`; a new feature normally belongs in
an existing service.

## Test the affected boundaries

- Domain tests cover factories, mutations, invariant failures, audit behavior,
  and tenant assignment programming guards without mocks.
- Handler tests use NSubstitute ports and cover success, not-found, conflict,
  reachable domain failure, persistence failure, and required interactions.
- Validator tests call synchronous `Validate` and need no repository fake.
- Persistence behavior involving tenant assignment, global filters, indexes,
  or foreign keys requires the narrow persistence-test tier established by the
  current solution and ADR index.
- Controller, OpenAPI, authentication, or runtime-boundary changes require the
  applicable contract and smoke checks documented in `docs/QUALITY.md` and CI.

Do not infer the available test tiers from a historical ADR. Inspect the
solution, workflows, and existing test projects before deciding what applies.

## Complete

Run every backend and governance command in `backend/AGENTS.md` and root
`AGENTS.md`. Report the actual build, test, coverage, migration, contract, and
smoke results that apply; do not call the task done while a required gate is
red.
