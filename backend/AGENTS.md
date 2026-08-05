# Backend — agent instructions

Read [../AGENTS.md](../AGENTS.md) first. This file contains durable rules for
`backend/`. Project membership and versions come from the solution, project
files, and `Directory.Packages.props`. Current code, tests, configuration, and
living documentation are the source of truth.

## Load by task

| Task | Read |
| --- | --- |
| Command/query/entity/repository/endpoint | `../.agents/skills/agenza-backend-use-case` |
| New business-context service | `../.agents/skills/agenza-backend-new-service` |
| Error-flow audit | `../.agents/skills/agenza-exception-flow-audit` |
| Tenant-isolation audit | `../.agents/skills/agenza-tenant-isolation-review` |
| Migration/schema change | `../.agents/skills/agenza-migration-safety` |
| API contract drift | `../.agents/skills/agenza-api-contract-review` |
| CI/coverage | `../docs/QUALITY.md` |

Inspect the closest live slice and tests before opening broader documentation.

## Architecture and flow

```text
Domain           no framework/project dependencies
Application      -> Domain + Admin.SharedKernel; ports in Abstractions/
Infrastructure   -> Application; implements ports and persistence
Api              -> Application + Infrastructure + Admin.SharedKernel.AspNetCore
Tests            target the boundary they verify
```

- Services are context-aggregated. A feature stays in the owning service unless
  evidence justifies a new context.
- Business operations are vertical slices under
  `Application/<Feature>/<Operation>/`; handlers and validators are
  assembly-scanned. Do not add MediatR or per-handler registrations.
- Controllers bind, dispatch, and map `Result` to HTTP. They contain no business
  rules or persistence logic.
- Domain factories/mutations enforce permanent invariants and return
  `DomainResult` before changing state.
- FluentValidation checks synchronous request shape only. Repositories and
  database queries do not belong in validators.
- Existence, uniqueness pre-checks, in-use state, and cross-aggregate decisions
  belong in handlers. Race-safe integrity belongs in database constraints and
  explicit `PersistenceResult` mapping.
- Expected outcomes never throw. Exceptions are limited to unexpected technical
  failure, programming violations, cleanup/rollback, and narrow
  technical-exception-to-result boundaries.

## Tenant isolation and persistence

- Resource APIs use `Admin.Identity.Client` and `TenantHeaderFilter`.
  `X-Tenant-Id` must match the authenticated claim; `[IgnoreTenant]` requires a
  reviewed, genuinely tenant-free endpoint.
- Repositories do not accept arbitrary tenant ids. EF filters read the live
  `DbContext.CurrentTenantId`; never capture a tenant constant during model
  construction or duplicate tenant filters per query.
- The save interceptor assigns the current tenant to new `ITenantOwned`
  entities and fails closed without valid tenant context. Handlers never assign
  `TenantId`.
- Each service owns its schema, migrations history, database role, and writes.
  Tenant-aware uniqueness and relationships include the tenant boundary.
- Never edit an applied migration; use the migration-safety skill for every
  schema change.

## Tests and packages

- Unit tests use xUnit, AwesomeAssertions, and NSubstitute around
  Domain/Application boundaries.
- Changes to EF tenant assignment, filters, tenant indexes, or relationships
  require the narrow persistence-test tier present in the current solution.
- Do not recreate broad integration suites without concrete failure evidence and
  an approved test design. Runtime contract/OIDC smoke remains a separate CI boundary.
- Package versions are centralized in `backend/Directory.Packages.props`.

## Required gates

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx
```

Also run the repository governance commands from the root instructions.
