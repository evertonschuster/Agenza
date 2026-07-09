# Backend (.NET microservices) — AI Assistant Instructions

## What this is

A small set of **context-aggregated services** (see docs/adr/0001): each
service owns one explicit business context end-to-end. Not nano-services —
a service may aggregate several related capabilities (identity-service
owns authentication AND tenant provisioning; services-service owns the
business's offerings, starting with Tags). Both `identity-service` and
`services-service` are real, fully-built services — copy either's
patterns for a new service.

## Read these before doing any work

| Resource                                       | When to read                                |
| ---------------------------------------------- | ------------------------------------------- |
| `README.md`                                    | Solution layout, commands                   |
| `.skills/backend-use-case/SKILL.md`            | Adding any use case / business logic        |
| `.skills/backend-new-microservice/SKILL.md`    | Creating a new service                      |
| `../docs/QUALITY.md`                           | What CI gates, before pushing               |
| `../docs/adr/`                                 | Cross-cutting decisions with rationale      |

## Critical constraints (non-negotiable)

### Layering (enforced by project references — never add a reference that violates this)

```
Domain          zero project references, zero NuGet framework deps
Application     → Domain only. Ports (interfaces) live in Abstractions/
Infrastructure  → Application. EF Core, external HTTP, OpenIddict stores
Api             → Application + Infrastructure. Controllers stay thin
Tests           → Application + Domain (unit); Api (integration, when added)
```

### Rich domain model — no anemic entities

- Entities validate their invariants in constructors/factory methods and
  throw domain exceptions on violation (see `Tenant`: name required).
- No public setters. `private set` + behavior methods that keep the
  entity valid. A `private` parameterless constructor exists only for EF.
- New value concepts with rules (email, time range, money) become value
  objects in Domain, not raw strings/decimals passed around.
- Business rules live in Domain/Application — never in controllers,
  never in EF configurations.

### Tenant scoping (repo-wide non-negotiable)

- Resource services validate JWTs via `shared/Admin.Identity.Client`'s
  `AddIdentityServiceAuthentication(...)` — do not hand-roll JwtBearer.
- Tenant id comes from `ITenantAccessor` (reads the `tenant_id` claim of
  the authenticated principal). **Never** from route/query/body.
- Every repository/query method takes the tenant id explicitly; EF
  queries filter by it. A cross-tenant read is a security bug, not a
  code-style issue.

### Use cases

- One class per use case in `Application/UseCases/<Name>/` with
  `<Name>Request` / `<Name>Result` records beside it.
- Dependencies are constructor-injected interfaces from `Abstractions/`.
- Multiple writes that must succeed together run inside
  `IUnitOfWork.ExecuteInTransactionAsync` (see `ProvisionTenantUseCase`).

### Tests

- xUnit; unit tests (`<Service>.Tests`) use hand-written fakes for
  Abstractions interfaces (see `ProvisionTenantUseCaseTests`) — no
  mocking library. The 80% line-coverage gate over Domain + Application
  is configured in `Directory.Build.props` and applies automatically.
- Api/Infrastructure are covered by integration tests
  (`<Service>.IntegrationTests`): `WebApplicationFactory` +
  Testcontainers against real Postgres — see
  `identity-service/IdentityService.IntegrationTests` for the pattern.
  Requires Docker running. Exempt from the line-coverage gate.
- New endpoint = new integration test exercising auth (401/403) and the
  happy path.

## Both must pass before every commit

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # coverage gate applied via Directory.Build.props
```
