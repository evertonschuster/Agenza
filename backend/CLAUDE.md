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
| `../docs/adr/0006-...md`                       | Tenant header/automatic scoping, BaseEntity/soft delete, GUID v7, generic repository, NSubstitute, business exceptions |
| `../docs/adr/0007-...md`                       | Controllers bind commands directly (no per-endpoint body record), Command→Domain mapping extension methods |
| `../docs/adr/0008-...md`                       | Automatic tenant assignment on save (AssignTenant + interceptor) |
| `../docs/adr/0009-...md`                       | TenantOwnedEntity base class (BaseEntity + ITenantOwned combined) |

## Critical constraints (non-negotiable)

### Layering (enforced by project references — never add a reference that violates this)

```
Domain          zero project references, zero NuGet framework deps
Application     → Domain, Admin.SharedKernel. Ports live in Abstractions/
Infrastructure  → Application, Admin.Identity.Client, Admin.SharedKernel.EntityFrameworkCore
Api             → Application + Infrastructure. Controllers stay thin
Tests           → Application + Domain (unit); Api (integration)
```

`backend/shared/Admin.SharedKernel` is cross-cutting CQRS/Result
infrastructure (like `Admin.Identity.Client` is for auth) — every
service's Application layer references it. It is NOT a place for
business logic. `backend/shared/Admin.SharedKernel.EntityFrameworkCore`
is a separate project (generic `RepositoryBase<TEntity>`, docs/adr/0006)
because it needs EF Core — Infrastructure-only, Application must never
see it.

### Comments — minimal, by default zero

Default to no comments, including XML `<summary>` docblocks (none of
these projects generate Swagger/API docs from them, so they're pure
comments, not tooling input). Trust identifiers and structure — a class,
method, or property name should carry its own meaning. Add a short
inline comment only for something a careful reviewer would still get
wrong without it: a security-relevant default (fail-closed auth), a
protocol/library quirk (OpenIddict claim remapping, a docker-network
issuer mismatch), or a non-obvious ordering/transaction constraint. One
line, not a paragraph — rationale for *why* a pattern was chosen (CQRS
vs. MediatR, Result vs. exceptions, schema-per-service) belongs in
`docs/adr/`, not repeated in every file that uses the pattern.

### Rich domain model — no anemic entities

- Entities validate their invariants in constructors/factory methods and
  **throw** domain exceptions on violation by default (see `Tenant` in
  identity-service: name required) — this is deliberate even though the
  rest of the stack uses the Result pattern, see "Result pattern" below
  for why Domain is normally the one place that still throws.
  **Exception:** `services-service`'s `Tag`/`Category`/`Service` are
  plain, always-valid-by-construction data holders instead — every rule
  they used to enforce themselves now lives entirely in their
  Create/Update FluentValidation validators, and their constructors/
  `Update` methods never throw (docs/adr/0011). A brand-new service
  should still default to the throwing pattern above; only deviate once
  a service's Domain rules are fully duplicated in mature validators.
- No public setters. `private set` + behavior methods that keep the
  entity valid. A `private` parameterless constructor exists only for EF.
- New value concepts with rules (email, time range, money) become value
  objects in Domain, not raw strings/decimals passed around.
- Business rules live in Domain/Application — never in controllers,
  never in EF configurations.
- Every aggregate root inherits `BaseEntity` (`{Service}.Domain/Common/`
  — one copy per service, Domain can't reference a shared assembly).
  Gives `Id`, `CreatedAt`/`CreatedBy`, `UpdatedAt`/`UpdatedBy`,
  `DeletedAt`/`DeletedBy`, `IsDeleted`, set only via `MarkCreated`/
  `MarkUpdated`/`MarkDeleted` — never public setters. Delete is a real
  soft delete: each service's `AuditableEntitySaveChangesInterceptor`
  turns a tracked `Deleted` entry into `Modified` and calls
  `MarkDeleted`. The query filter that hides soft-deleted rows from
  ordinary reads, and a supporting `DeletedAt` index, are applied
  **automatically** to every `BaseEntity` type by
  `Admin.SharedKernel.EntityFrameworkCore`'s `ApplyAuditableConventions`
  (called once from each `DbContext.OnModelCreating`) — don't add
  `HasQueryFilter` by hand in an `IEntityTypeConfiguration` (see
  docs/adr/0006).
- New entity ids come from `Guid.CreateVersion7()` directly (UUID v7),
  not `Guid.NewGuid()`.
- Domain exceptions inherit that service's `BusinessException`
  (`{Service}.Domain/Exceptions/BusinessException.cs` — `Code` +
  `Message`), not a raw `Exception`/`ArgumentException`. The Api's global
  `BusinessExceptionHandler` (see "Result pattern" below) maps any
  `BusinessException` to a 400 Problem Details response.
- A tenant-owned aggregate root inherits `TenantOwnedEntity`
  (`{Service}.Domain/Common/TenantOwnedEntity.cs` — `BaseEntity` +
  `ITenantOwned` combined, see `Tag`/`Service`) instead of
  `BaseEntity` directly, and needs no `ITenantOwned`/`AssignTenant`
  boilerplate of its own. Its constructor never takes a `tenantId`
  parameter at all — `TenantId` starts `Guid.Empty` and only
  `AssignTenant(Guid tenantId)` (inherited, not overridden) can set it,
  throwing the shared `InvalidTenantException` on empty (docs/adr/0009)
  — a missing tenant is a scoping bug, not an entity-specific invariant,
  so every entity's 400 response uses the same `Code`.
  `AuditableEntitySaveChangesInterceptor` calls `AssignTenant`
  automatically for a newly added entity whose `TenantId` is still
  `Guid.Empty` — mirrors `MarkCreated` exactly, just for a
  security-relevant field instead of an audit one. A mapping extension
  (`ToModel()`, see CQRS section below) is therefore parameterless too —
  it never threads a tenant id through.

### Tenant scoping (repo-wide non-negotiable)

- Resource services validate JWTs via `shared/Admin.Identity.Client`'s
  `AddIdentityServiceAuthentication(...)` — do not hand-roll JwtBearer.
- The client sends the tenant id in the `X-Tenant-Id` header on every
  request (admin-frontend's `AuthenticatedHttpClient` attaches it
  automatically). It is **never trusted on its own**: `Admin.Identity.Client`'s
  `TenantHeaderFilter` (a global `IAsyncActionFilter`, wired into
  `AddControllers(options => options.Filters.Add<TenantHeaderFilter>())`)
  rejects the request with 403 before any action runs unless the header
  equals the token's `tenant_id` claim. **Every action requires a
  validated tenant by default** — opt out with `[IgnoreTenant]` (class or
  method) for actions that genuinely aren't tenant-scoped (M2M
  provisioning, OIDC protocol endpoints). Once the filter has run, read
  `ITenantAccessor.TenantId` directly (the throwing property) — don't
  repeat the check in the action.
- A tenant-owned entity inherits `TenantOwnedEntity`, which implements
  `ITenantOwned` (`{Service}.Domain/Common/ITenantOwned.cs`,
  `Guid TenantId { get; }` + `void AssignTenant(Guid tenantId)`) once for
  every tenant-scoped aggregate in the service — don't implement the
  interface directly on the entity. Its `DbContext` exposes a public
  `CurrentTenantId` property (sourced from
  `ICurrentTenantProvider`) and passes `this` + `typeof(ITenantOwned)` to
  `ApplyAuditableConventions` — the query filter must read
  `CurrentTenantId` off the live instance, never a value snapshotted at
  model-build time (EF Core caches the compiled model per `DbContext`
  *type*, so a baked-in constant would leak across every request — see
  docs/adr/0006 for the incident this caught). Repository methods,
  commands, and queries for that entity never take an explicit
  `tenantId` parameter (see `ITagRepository`/`CreateTagCommand`).
- **New-entity tenant assignment is automatic, not handler code**
  (docs/adr/0008): a mapping extension constructs with `Guid.Empty`
  (`command.ToModel()`, no tenant parameter needed) and
  `AuditableEntitySaveChangesInterceptor` calls `AssignTenant` on save,
  sourcing the tenant from `ICurrentTenantProvider` itself — the
  interceptor throws rather than persisting a tenant-less row if none is
  available. A cross-tenant read/write is still a security bug, not a
  code-style issue — the automatic filter and automatic assignment are
  defense in depth on top of `TenantHeaderFilter`, not a replacement for
  it.
- See docs/adr/0006 for why the header filter is wired into
  services-service's `Program.cs` only, not identity-service's, and for
  the automatic tenant-scoping mechanism in full.

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
- Controllers depend on `IDispatcher` (constructor-injected),
  `await _dispatcher.Send(...)` / `.Query(...)`, and map the `Result`
  with `result.ToActionResult(this, value => Ok(value))` (or `Created`/
  `NoContent`/etc.) — never a concrete handler type, never a try/catch
  per exception type.
- **Bind the command/query itself as the action parameter — no
  per-endpoint `...Body` record** (docs/adr/0007). `[ApiController]`
  already infers `[FromBody]` for a complex-type parameter with no
  explicit binding source; a route id binds into its own `Guid id`
  parameter independently and gets merged in with a `with` expression
  right before dispatching (`command with { TagId = id }`) since the
  client's JSON body never carries it. See `TagsController` for the
  pattern.
- **Command → Domain mapping lives in an extension method next to the
  command**, not inlined in the handler (docs/adr/0007):
  `{Operation}CommandExtensions.ToModel(...)` for construction,
  `.ApplyTo(entity)` for mutation. `Handle(...)` calls it and reads as
  orchestration only. See `CreateTagCommandExtensions`/
  `UpdateTagCommandExtensions`.
- Register nothing by hand: each service's `Application/DependencyInjection.cs`
  (`AddXApplication()`) scans its own assembly for handlers and
  FluentValidation validators. A new slice just needs its files created.

### Result pattern — where exceptions still live and where they don't

- **Domain** (entity constructors/methods, value object factories):
  still throws by default — always a `BusinessException` subtype
  (`Code` + `Message`), never a raw `Exception`/`ArgumentException`.
  Domain has zero project references, so it cannot depend on
  `Admin.SharedKernel`'s `Result` type — and by the time a handler
  constructs a domain object, FluentValidation has already checked
  shape, so hitting a domain exception in normal operation means a
  validator/domain mismatch bug, not a real user-facing outcome.
  `identity-service`'s `Tenant` is the live example. **Exception:**
  `services-service`'s `Tag`/`Category`/`Service` don't throw at all —
  every invariant they used to check is now enforced entirely by
  FluentValidation before construction, so Domain has nothing left to
  guard (docs/adr/0011). `TagColor.From` likewise no longer throws.
- **Application handlers do NOT catch it.** Let a `BusinessException`
  propagate out of `Handle(...)` uncaught — no per-handler try/catch
  (docs/adr/0006). Cross-aggregate rules that need a repository
  round-trip (uniqueness, existence) still return `Result.Failure`
  directly, no exception involved at any point; role/scope checks return
  `Forbid()`. Exceptions are reserved for genuine Domain-invariant
  violations only.
- **The Api's global `BusinessExceptionHandler`** (`IExceptionHandler`,
  registered via `AddExceptionHandler<T>()` + `app.UseExceptionHandler()`
  in `Program.cs`) is the *one* place that turns a `BusinessException`
  into an HTTP response (400 Problem Details, `Title` = `Code`, `Detail`
  = `Message`). `Admin.SharedKernel.GenericExceptionHandler`, registered
  right after it, catches everything else: logs at Error level via
  `ILogger`, returns a generic 500 Problem Details with no exception
  details in the body.

### FluentValidation

- One `<Operation>CommandValidator : AbstractValidator<TCommand>` per
  command that takes user input, checking cheap shape rules (required,
  length, enum/palette membership) **and** cross-aggregate rules that
  need a repository round-trip (uniqueness, existence) — see
  docs/adr/0010. The validator's constructor takes the relevant
  repository interface(s) (e.g. `ICategoryRepository`) and uses async
  `MustAsync` rules for those checks, e.g.:
  ```csharp
  RuleFor(c => c.Name)
      .MustAsync(async (name, ct) => !await categoryRepository.NameExistsAsync(name, excludeCategoryId: null, ct))
      .WithErrorCode("Category.DuplicateName")
      .WithMessage(c => $"Já existe uma categoria chamada '{c.Name}'.");
  ```
  Handlers assume validated input and focus purely on orchestration
  (fetch what's needed → construct/apply → persist → return) — no more
  inline `if (...) return Result.Failure(...)` existence/uniqueness
  checks. An Update handler that needs the entity re-fetches it by id
  and asserts non-null with `!`, with a one-line comment noting
  existence is already guaranteed by the validator (see `TagsController`'s
  vertical, or any of `CreateTag`/`UpdateTag`/`CreateCategory`/
  `UpdateCategory`/`CreateService`/`UpdateService` for the pattern).
- **Accepted trade-off (docs/adr/0010):** the dispatcher's `ValidateAsync`
  collapses *every* FluentValidation failure — shape or cross-aggregate —
  into a single generic `Error.Validation("Validation.Failed", ...)`
  (400). It does not read FluentValidation's `ErrorCode`/`Severity`, so
  a duplicate-name or not-found check that used to return a distinct
  409/404 from the handler now returns a generic 400 from validation.
  Each moved rule still sets `.WithErrorCode("Entity.SpecificCode")`
  anyway — cheap, future-proofs a later Dispatcher change, and makes
  validator unit tests able to assert on the specific rule that failed.
- Runs automatically: the dispatcher resolves `IValidator<TCommand>` (if
  one is registered) and validates before calling the handler. A
  validation failure never reaches the handler.
- **Any validator with an async `MustAsync` rule can no longer be tested
  with the synchronous `Validate(...)`** — FluentValidation throws
  `AsyncValidatorInvokedSynchronouslyException`, even for a test that
  only exercises an unrelated sync rule. Use
  `await validator.ValidateAsync(command)` in every test for such a
  validator, and construct the validator with NSubstitute repository
  fakes stubbing the happy path as the default setup (e.g.
  `repository.NameExistsAsync(...).Returns(false)`,
  `repository.GetByIdAsync(...).Returns(someEntity)`) so shape-only
  tests aren't tripped up by an unrelated async rule.

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
  **NSubstitute** mocks for `Abstractions/` interfaces
  (`Substitute.For<IPort>()`, `.Returns(...)`, `.Received(n)`/
  `.DidNotReceive()` — not hand-written fakes, see docs/adr/0006),
  asserting on the returned `Result`
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
