# Backend (.NET microservices) — AI Assistant Instructions

## What this is

A small set of **context-aggregated services** (see docs/adr/0001): each
service owns one explicit business context end-to-end. Not nano-services —
a service may aggregate several related capabilities (identity-service
owns authentication AND tenant provisioning; services-service owns the
business's offerings, starting with Tags). Both `identity-service` and
`services-service` are real, fully-built services — copy either's
patterns for a new service.

Each service is built as **CQRS + vertical slices inside Clean
Architecture layers, with a Result pattern instead of exceptions for
business errors** (see docs/adr/0005 for the full rationale, including
why MediatR/FluentAssertions specifically are NOT used here).

## Read these before doing any work

| Resource                                       | When to read                                |
| ---------------------------------------------- | ------------------------------------------- |
| `README.md`                                    | Solution layout, commands                   |
| `.skills/backend-use-case/SKILL.md`            | Adding any command/query / business logic   |
| `.skills/backend-new-microservice/SKILL.md`    | Creating a new service                      |
| `../docs/QUALITY.md`                           | What CI gates, before pushing               |
| `../docs/adr/0005-...md`                       | CQRS/vertical-slice/Result convention rationale |
| `../docs/adr/`                                 | Cross-cutting decisions with rationale      |

## Critical constraints (non-negotiable)

### Layering (enforced by project references — never add a reference that violates this)

```
Domain          zero project references, zero NuGet framework deps
Application     → Domain, Admin.SharedKernel. Ports live in Abstractions/
Infrastructure  → Application. EF Core, external HTTP, OpenIddict stores
Api             → Application + Infrastructure. Controllers stay thin
Tests           → Application + Domain (unit); Api (integration)
```

`backend/shared/Admin.SharedKernel` is cross-cutting CQRS/Result
infrastructure (like `Admin.Identity.Client` is for auth) — every
service's Application layer references it. It is NOT a place for
business logic.

### Rich domain model — no anemic entities

- Entities validate their invariants in constructors/factory methods and
  **throw** domain exceptions on violation (see `Tenant`: name required,
  `Tag`: name/color/description rules). This is deliberate even though
  the rest of the stack uses the Result pattern — see "Result pattern"
  below for why Domain is the one place that still throws.
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

### CQRS + vertical slices

- One folder per feature under `Application/<Feature>/`, one subfolder
  per operation: `Application/Tags/CreateTag/{CreateTagCommand,
  CreateTagCommandHandler, CreateTagCommandValidator}.cs`. A DTO shared
  by more than one operation in the feature sits at the feature root
  (`Application/Tags/TagResponse.cs`).
- Commands mutate (`ICommand` when there's nothing to return,
  `ICommand<TResponse>` otherwise); queries read (`IQuery<TResponse>`).
  Each has exactly one handler (`ICommandHandler<...>` /
  `IQueryHandler<...>`), returning `Result` / `Result<TResponse>`
  (`Admin.SharedKernel`) — never throwing for an expected business
  outcome.
- Controllers depend on `IDispatcher` (constructor-injected), build a
  command/query, `await _dispatcher.Send(...)` /
  `.Query(...)`, and map the `Result` with
  `result.ToActionResult(this, value => Ok(value))` (or `Created`/
  `NoContent`/etc.) — never a concrete handler type, never a try/catch
  per exception type.
- Register nothing by hand: each service's `Application/DependencyInjection.cs`
  (`AddXApplication()`) scans its own assembly for handlers and
  FluentValidation validators. A new slice just needs its files created.

### Result pattern — where exceptions still live and where they don't

- **Domain** (entity constructors/methods, value object factories):
  still throws. It has zero project references, so it cannot depend on
  `Admin.SharedKernel`'s `Result` type — and by the time a handler
  constructs a domain object, FluentValidation has already checked
  shape, so hitting a domain exception in normal operation means a
  validator/domain mismatch bug, not a real user-facing outcome.
- **Application handlers**: catch domain exceptions right where they
  construct/mutate a domain object and convert to
  `Result.Failure(Error.Validation(...))` — see any `*CommandHandler`
  for the pattern. Cross-aggregate rules that need a repository
  round-trip (uniqueness, existence) return `Result.Failure` directly,
  no exception involved at any point.
- **Nothing throws past the Application boundary** for a business
  outcome. A raw, unhandled exception reaching the controller means an
  actual bug or infrastructure failure — let it 500, don't catch it.

### FluentValidation

- One `<Operation>CommandValidator : AbstractValidator<TCommand>` per
  command that takes user input, checking cheap shape rules (required,
  length, enum/palette membership) — NOT cross-aggregate rules (those
  need the repository, so they belong in the handler).
- Runs automatically: the dispatcher resolves `IValidator<TCommand>` (if
  one is registered) and validates before calling the handler. A
  validation failure never reaches the handler.

### UnitOfWork

- Defined **per service** in `Application/Abstractions/IUnitOfWork.cs` —
  not shared, because different services genuinely need different
  shapes (see docs/adr/0005). Match the shape to what the service's
  writes actually need:
  - Only ever writing through one `DbContext`? A plain
    `SaveChangesAsync(CancellationToken)` is enough (services-service).
    Repositories only stage changes (`Add`/`Remove`, no internal
    commit) — the handler commits explicitly.
  - Writing through more than one abstraction that each commit on their
    own (e.g. an EF repository AND `UserManager`)? Wrap both in an
    explicit transaction: `ExecuteInTransactionAsync<TResult>(Func<...,
    Task<Result<TResult>>>, ...)`, Result-aware so a handler's
    `Result.Failure` rolls back exactly like an exception would
    (identity-service).

### API versioning

- Every business controller: `[ApiVersion("1.0")]` +
  `[Route("api/v{version:apiVersion}/...")]` (or `internal/v{version:apiVersion}/...`
  for M2M-only routes). `Asp.Versioning.Mvc`, wired via
  `AddApiVersioning(...).AddMvc()` in `Program.cs`.
- OpenIddict's own protocol endpoints (`/connect/*`,
  `/.well-known/...`) are **never** versioned — those paths are fixed
  by the OIDC spec.

### Tests

- xUnit + **AwesomeAssertions** (`result.Should()....`) — not
  FluentAssertions (v8+ requires a paid license; AwesomeAssertions is
  the actively-maintained free fork, see docs/adr/0005). Global
  `using AwesomeAssertions;` is set per test csproj.
- Unit tests (`<Service>.Tests`) target **handlers**, not controllers:
  hand-written fakes for `Abstractions/` interfaces (no mocking
  library), asserting on the returned `Result`
  (`result.IsSuccess`/`result.Error.Type`/`result.Value`). The 80%
  line-coverage gate over Domain + Application is configured in
  `Directory.Build.props`/`.targets` and applies automatically —
  `Admin.SharedKernel` is excluded from every service's gate since it
  has its own (`Admin.SharedKernel.Tests`).
- Api/Infrastructure are covered by integration tests
  (`<Service>.IntegrationTests`): `WebApplicationFactory` +
  Testcontainers against real Postgres — see
  `identity-service/IdentityService.IntegrationTests` for the pattern
  (including a resource server's `TestAuthHandler` trick in
  `services-service/ServicesService.IntegrationTests` when the service
  being tested isn't the OIDC provider itself). Requires Docker
  running. Exempt from the line-coverage gate.
- New endpoint = new integration test exercising auth (401/403),
  validation (400), and the happy path — plus a unit test per new
  handler/validator.

## Both must pass before every commit

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # coverage gate applied via Directory.Build.props/.targets; integration needs Docker
```
