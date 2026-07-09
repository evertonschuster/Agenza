---
name: backend-use-case
description: >
  Use this skill whenever adding or changing business logic in any .NET
  backend service — a new command, query, entity, or repository method.
  Trigger on "add endpoint", "implement [operation]", "create [entity]"
  for anything under backend/. It encodes the project's CQRS/vertical-
  slice/Result-pattern conventions (docs/adr/0005), layering, rich-domain,
  tenant-scoping, and testing conventions; do NOT write backend business
  logic without reading it first.
---

# Backend Use Case

The reference implementation is `services-service`'s Tags vertical.
Open these files and mirror their shape:

- `ServicesService.Domain/Entities/Tag.cs`, `ValueObjects/TagColor.cs` — entity/VO with invariants
- `ServicesService.Application/Tags/CreateTag/` — full command slice (Command/Handler/Validator)
- `ServicesService.Application/Tags/TagResponse.cs` — DTO shared across the feature's operations
- `ServicesService.Application/Abstractions/` — ports (`ITagRepository`, `IUnitOfWork`)
- `ServicesService.Api/Controllers/TagsController.cs` — dispatch + Result → HTTP mapping
- `ServicesService.Tests/Tags/CreateTag/` — handler + validator unit tests
- `ServicesService.IntegrationTests/TagsEndpointTests.cs` — end-to-end HTTP tests

identity-service's `Tenants/ProvisionTenant/` slice is the second
reference — read it when the operation needs a database transaction
across more than one abstraction (see step 3's UnitOfWork note).

## Build order (TDD — test first at each step)

### 1. Domain entity or value object

- Constructor/factory validates every invariant; throw `ArgumentException`
  or a dedicated domain exception with a clear message. Domain stays
  exception-based even though the rest of the stack uses Result — see
  docs/adr/0005 for why (zero project references; FluentValidation
  already checked shape by the time Domain runs).
- No public setters. Add a `private` parameterless constructor ONLY if EF
  needs it, and keep it private.
- State changes go through named behavior methods (`Rename`, `Cancel`,
  `Reschedule`), each keeping the entity valid.
- Tests: plain xUnit + AwesomeAssertions, no fakes needed — Domain has
  zero dependencies.

### 2. Port (interface) in `Application/Abstractions/`

- Narrow, intention-revealing methods (`Add`, `GetByIdAsync`) — not a
  generic repository. `Add`/`Remove` are synchronous and only stage the
  change (no internal commit) — see step 3's UnitOfWork note for why.
- Every method that touches tenant-owned data takes the tenant id (or an
  aggregate that carries it) explicitly, plus a `CancellationToken`.

### 3. Command or query slice in `Application/<Feature>/<Operation>/`

```
Application/Tags/
├── TagResponse.cs                     shared DTO (feature root)
└── CreateTag/
    ├── CreateTagCommand.cs            : ICommand<TagResponse>
    ├── CreateTagCommandValidator.cs   AbstractValidator<CreateTagCommand> - shape only
    └── CreateTagCommandHandler.cs     : ICommandHandler<CreateTagCommand, TagResponse>
```

- A **command** mutates (`ICommand` if nothing to return,
  `ICommand<TResponse>` otherwise); a **query** reads
  (`IQuery<TResponse>`). Handler returns `Result` / `Result<TResponse>`
  (`Admin.SharedKernel`) — never throws for an expected business outcome
  (validation failure, not-found, conflict, forbidden). Use
  `Error.Validation/.NotFound/.Conflict/.Forbidden(code, message)`.
- Validator (commands with user input only): cheap synchronous shape
  rules — required, length, enum/palette membership. NOT cross-aggregate
  rules (uniqueness, existence) — those need the repository, so they
  stay in the handler. The dispatcher runs the validator automatically
  before the handler; don't call it yourself.
- Constructor-injected ports only — no EF, no HttpClient, no ASP.NET
  types in Application.
- Multiple writes that must succeed together → wrap in
  `IUnitOfWork`. Match its shape to the real need (docs/adr/0005):
  a single `SaveChangesAsync` if everything goes through one `DbContext`
  (services-service's shape), or a Result-aware
  `ExecuteInTransactionAsync<TResult>` if the operation spans more than
  one abstraction that each commit independently, e.g. an EF repository
  AND `UserManager` (identity-service's shape, see
  `ProvisionTenantCommandHandler`).
- Nothing to register by hand — each service's
  `Application/DependencyInjection.cs` scans the assembly for handlers
  and validators.

### 4. Unit tests with hand-written fakes

- One fake class per port, defined in the test project; capture calls
  with simple lists/fields, not a mocking library. Include a
  `FakeUnitOfWork` matching the service's `IUnitOfWork` shape.
- AwesomeAssertions, asserting on the `Result`: `result.IsSuccess`,
  `result.Value.Xyz`, `result.Error.Type.Should().Be(ErrorType.Conflict)`.
- Test the happy path AND every failure path (validation, not-found,
  conflict) — each should return the right `ErrorType`, never throw.
- Add a small validator test file too (`AbstractValidator.Validate(...)`
  directly, no DI needed) covering each rule's pass/fail case.

### 5. Infrastructure adapter

- Repository implements the port via the service's `DbContext`.
  `Add`/`Remove` only stage the change — no `SaveChangesAsync` inside
  the repository (the handler commits via `IUnitOfWork`).
- EF configuration lives in `Infrastructure/Persistence/Configurations/`.
- New tables → `dotnet ef migrations add <Name>` from the Api project
  directory (the service's tables live in its own schema —
  `HasDefaultSchema` is already set in the DbContext).

### 6. Controller (thin)

- Constructor-inject `IDispatcher` (never a concrete handler type) and
  `ITenantAccessor` (from `shared/Admin.Identity.Client`) when the route
  is tenant-scoped.
- `[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/...")]` (or
  `internal/v{version:apiVersion}/...` for M2M-only routes).
- Each action: resolve tenant (never from the request payload) → build
  the command/query → `await _dispatcher.Send(...)` /
  `.Query(...)` → `result.ToActionResult(this, value => Ok(value))`
  (or `Created`/`NoContent`). No try/catch per exception type.
- `[Authorize]` by default; scope checks (`User.HasScope(...)`) for
  M2M-only endpoints (see `TenantsController`).

### 7. Integration test for the new endpoint

- In the service's `<Service>.IntegrationTests` project (pattern:
  `TagsEndpointTests`/`ProvisioningEndpointTests` — WebApplicationFactory
  + Testcontainers Postgres, shared via `IClassFixture`). If the service
  is a resource server (not the OIDC provider itself), use the
  `TestAuthHandler` trick from `ServicesService.IntegrationTests` instead
  of forging a real JWT.
- Minimum: unauthenticated request → 401, wrong scope/tenant → 403,
  a validation failure → 400, happy path → expected status + persisted
  effect. Add a rollback-verification test if the handler uses
  `ExecuteInTransactionAsync` (pattern: identity-service's
  "fails and rolls back" test).

## Definition of done

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # coverage gate via Directory.Build.props/.targets; integration needs Docker
```

Both green, coverage gate passing, no new NU1903 (vulnerable package)
warnings in the build output.
