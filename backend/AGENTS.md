# Backend — agent instructions

Read [../AGENTS.md](../AGENTS.md) first. This file contains durable rules for
`backend/`; current package versions and project membership come from the
solution, project files, and `Directory.Packages.props`. Decision history is
routed through [../docs/adr/README.md](../docs/adr/README.md).

## Read by task

| Task | Read |
| --- | --- |
| Command, query, entity, repository, endpoint | `.agents/skills/agenza-backend-use-case` |
| Brand-new business-context service | `.agents/skills/agenza-backend-new-service` |
| Exception/error-flow audit | `.agents/skills/agenza-exception-flow-audit` |
| Tenant-isolation audit | `.agents/skills/agenza-tenant-isolation-review` |
| Migration or schema change | `.agents/skills/agenza-migration-safety` |
| API contract drift | `.agents/skills/agenza-api-contract-review` |
| CI and coverage behavior | `docs/QUALITY.md` |
| Rationale or superseded decisions | `docs/adr/README.md`, then only routed ADRs |

Inspect the live service and tests before relying on an example in prose.

## Architecture

```text
Domain           no project references or framework dependencies
Application      -> Domain + Admin.SharedKernel; ports in Abstractions/
Infrastructure   -> Application + infrastructure-specific shared packages
Api              -> Application + Infrastructure + Admin.SharedKernel.AspNetCore
Tests            -> Domain/Application unit boundaries
PersistenceTests -> Infrastructure security behavior where needed
```

- Services are context-aggregated, not one microservice per entity. A feature
  that fits an existing context stays in that service as vertical slices.
- Business slices live under `Application/<Feature>/<Operation>/`. Handlers and
  validators are assembly-scanned; do not register each one manually or add
  MediatR.
- Controllers bind commands/queries, dispatch, and map `Result` to HTTP. They do
  not own business rules or persistence.
- `Admin.SharedKernel` is framework-agnostic CQRS/Result infrastructure.
  ASP.NET Core and EF helpers stay in their dedicated sibling packages.

## Domain and error flow

- Aggregate roots inherit the service-local `BaseEntity`; tenant-owned roots
  inherit `TenantOwnedEntity`. Audit and tenant fields have no public setters.
- Entities enforce permanent invariants through private construction and
  behavior methods returning `DomainResult`. Validate all new values before
  mutating state so a failure cannot leave a partial update.
- FluentValidation checks command shape only. Validators are synchronous and
  never inject repositories or query the database.
- Existence, uniqueness, in-use, and other current-state checks belong in the
  handler and return `Result.Failure`.
- A recognized database conflict becomes `PersistenceResult.Failure` at the
  infrastructure boundary and is mapped explicitly by Application.
- Exceptions are reserved for unexpected technical failure, programming
  violations, rollback/resource cleanup, or technical-exception-to-result
  conversion at an infrastructure boundary. Expected outcomes never throw.

## Tenant isolation and persistence

- Resource APIs use `Admin.Identity.Client` and `TenantHeaderFilter`. The
  `X-Tenant-Id` header is verified against the authenticated claim; client input
  alone is never trusted. `[IgnoreTenant]` requires a genuinely tenant-free,
  reviewed endpoint.
- Repositories do not accept arbitrary tenant ids. EF query filters read the
  live `DbContext.CurrentTenantId`; do not capture a tenant constant while the
  model is built and do not add hand-written tenant filters per entity.
- The save interceptor assigns the current tenant to new `ITenantOwned`
  entities and fails closed if no valid tenant exists. Handlers do not assign
  `TenantId`.
- Apply shared auditable conventions once in `OnModelCreating`. Uniqueness and
  relationships involving tenant-owned data include the tenant boundary.
- Each service owns its schema, migrations history, database role, and writes.
  Services never share tables or write another service's schema.
- A migration uses `.agents/skills/agenza-migration-safety`; never edit an
  applied migration or silently destroy/transform existing data.

## Testing and packages

- Unit tests use xUnit, AwesomeAssertions, and NSubstitute, asserting returned
  `Result` behavior at Domain/Application boundaries.
- Inspect the current `*PersistenceTests` projects before assessing tenant EF
  coverage. Add or extend the narrow persistence tier when a change affects
  assignment, filters, tenant indexes, or tenant-aware relationships.
- Do not restore broad Testcontainers/`WebApplicationFactory` suites without an
  ADR supported by concrete failure evidence. Runtime OIDC/contract smokes
  remain a separate CI boundary.
- Package versions are centralized in `backend/Directory.Packages.props`.
  Project files use versionless `PackageReference` entries.
- Comments default to zero. Keep one only for a non-obvious security default,
  concurrency/transaction constraint, provider quirk, or unavoidable
  suppression. Rationale belongs in an ADR.

## Required gates

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx
```

Also run the repo-wide governance commands from [../AGENTS.md](../AGENTS.md).
