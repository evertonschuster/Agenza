# Backend (.NET microservices) — Agent Instructions

Read [../AGENTS.md](../AGENTS.md) first for repo-wide rules (question
policy, tenant scoping, exception policy, rule persistence). This file
covers what's specific to `backend/`.

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
| ----------------------------------------------- | -------------------------------------------- |
| `README.md`                                    | Solution layout, commands                   |
| `agent-skills/agenza-backend-use-case`         | Adding any command/query / business logic — canonical, portable |
| `.skills/backend-new-microservice/SKILL.md`    | Creating a new service                      |
| `agent-skills/agenza-exception-flow-audit`     | Auditing throw/try/catch/Exception usage    |
| `agent-skills/agenza-tenant-isolation-review`  | Auditing tenant scoping                     |
| `agent-skills/agenza-migration-safety`         | Any EF Core migration or schema change      |
| `../docs/QUALITY.md`                           | What CI gates, before pushing               |
| `../docs/adr/0005-...md`                       | CQRS/vertical-slice/Result convention rationale |
| `../docs/adr/`                                 | Cross-cutting decisions with rationale      |
| `../docs/adr/0006-...md`                       | Tenant header/automatic scoping, BaseEntity/soft delete, GUID v7, generic repository, NSubstitute, business exceptions |
| `../docs/adr/0007-...md`                       | Controllers bind commands directly (no per-endpoint body record), Command→Domain mapping extension methods |
| `../docs/adr/0008-...md`                       | Automatic tenant assignment on save (AssignTenant + interceptor) |
| `../docs/adr/0009-...md`                       | TenantOwnedEntity base class (BaseEntity + ITenantOwned combined) |
| `../docs/adr/0012-...md`                       | Cross-aggregate checks live in handlers, not validators — validators take no repository dependencies |
| `../docs/adr/0014-...md`                       | Result pattern end-to-end — Domain/persistence no longer throw for expected outcomes |
| `../docs/adr/0015-...md`                       | Integration tests removed — CI runs unit tests only, no database dependency |
| `../docs/adr/0017-...md`                       | Schema-scoped `__EFMigrationsHistory` per service — read before touching either service's migrations or `DependencyInjection.cs` |
| `../docs/adr/0018-...md`                       | `Admin.SharedKernel` vs `Admin.SharedKernel.AspNetCore` split — read before adding to either |

## Critical constraints (non-negotiable)

### Layering (enforced by project references — never add a reference that violates this)

```text
Domain          zero project references, zero NuGet framework deps
Application     → Domain, Admin.SharedKernel. Ports live in Abstractions/
Infrastructure  → Application, Admin.Identity.Client, Admin.SharedKernel.EntityFrameworkCore
Api             → Application + Infrastructure + Admin.SharedKernel.AspNetCore. Controllers stay thin
Tests           → Application + Domain (unit only — no integration tests, docs/adr/0015)
```

`backend/shared/Admin.SharedKernel` is cross-cutting CQRS/Result
infrastructure (like `Admin.Identity.Client` is for auth) — every
service's Application layer references it. It is NOT a place for
business logic, and it takes no ASP.NET Core dependency (no
`FrameworkReference`, just `Microsoft.Extensions.DependencyInjection.Abstractions` +
FluentValidation) so that Application, which references it, stays
framework-agnostic. The MVC-specific half — `ResultExtensions.ToActionResult`
and `GenericExceptionHandler` — lives in the sibling
`backend/shared/Admin.SharedKernel.AspNetCore` instead (docs/adr/0018);
only `.Api` projects reference it. `backend/shared/Admin.SharedKernel.EntityFrameworkCore`
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

- Entities validate their invariants in a `private` constructor plus a
  `public static DomainResult<T> Create(...)` factory, and return
  `DomainResult`/`DomainResult<T>` on violation instead of throwing — see
  `Tenant` in identity-service (name required) and `Tag`/`Category`/
  `Service`/`TagColor` in services-service (name/description length,
  duration range/ordering, price, discount range, palette membership),
  and `DomainResult`/`DomainError` (`{Service}.Domain/Common/`) — this is
  still defense-in-depth on top of FluentValidation, not a replacement
  for it (docs/adr/0012, docs/adr/0014): a handler that reaches Domain
  with invalid data means a validator/domain mismatch bug, but per the
  repo-wide no-exceptions-for-expected-outcomes directive (docs/adr/0014)
  that bug now surfaces as a `DomainResult.Failure` mapped to
  `Error.Validation` (400), not a thrown exception. `Update` methods
  return plain `DomainResult` (no value to return); both `Create` and
  `Update` validate every new value into a local before assigning/
  returning, so a later validation failure can never leave the entity
  partially mutated.
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
- A domain `DomainError` (`Code` + `Message`) maps to
  `Admin.SharedKernel.Error` via an explicit, tested per-service
  `DomainErrorMapper.ToApplicationError()` extension
  (`{Service}.Application/Abstractions/DomainErrorMapper.cs`) — always
  `Error.Validation(code, message)` (400), never a raw
  `Exception`/`ArgumentException` or an HTTP type leaking into Domain.
  `Code` values are the same stable strings the old `BusinessException`
  subtypes used (`"Tag.Invalid"`, `"Service.Invalid"`, etc.).
- A tenant-owned aggregate root inherits `TenantOwnedEntity`
  (`{Service}.Domain/Common/TenantOwnedEntity.cs` — `BaseEntity` +
  `ITenantOwned` combined, see `Tag`/`Service`) instead of
  `BaseEntity` directly, and needs no `ITenantOwned`/`AssignTenant`
  boilerplate of its own. Its constructor never takes a `tenantId`
  parameter at all — `TenantId` starts `Guid.Empty` and only
  `AssignTenant(Guid tenantId)` (inherited, not overridden) can set it.
  Unlike entity validation, `AssignTenant` still **throws** a plain
  `InvalidOperationException` on an empty guid (not a `DomainResult`) —
  `TenantHeaderFilter` already rejects any request with a missing/
  mismatched tenant header with 403 before any handler/interceptor runs,
  so this can only happen via an internal bug, never directly from a
  request (docs/adr/0014); it is not a business outcome, so it is exempt
  from the no-exceptions-for-expected-outcomes rule below.
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

### Result pattern — exceptions are not conventional control flow (docs/adr/0014)

No layer uses exceptions for an *expected* outcome — input validation,
domain invariants, not-found, conflict/duplicate, in-use, tenant
authorization. Every layer's failure signature is explicit in its return
type. Exceptions are reserved for genuinely unexpected/unrecoverable
failures: missing startup configuration, framework/programmer-error
guards, an unrecognized database error, transactional rollback cleanup.

- **Domain** (entity constructors/methods, value object factories):
  returns `DomainResult`/`DomainResult<T>` (`{Service}.Domain/Common/`,
  one pair per service — Domain has zero project references, so it can't
  depend on `Admin.SharedKernel`'s `Result`), never throws for a
  validation failure. `identity-service`'s `Tenant` and services-service's
  `Tag`/`Category`/`Service`/`TagColor` all follow this. See "Rich domain
  model" above for the `Create`/`Update` shape.
- **Application handlers have no `try/catch` for business flow.** A
  handler calls `Entity.Create(...)`/`.Update(...)`, checks
  `domainResult.IsFailure`, and maps the failure via
  `DomainErrorMapper.ToApplicationError()` — no exception ever
  propagates out of `Handle(...)` for an expected outcome. Cross-aggregate
  rules that need a repository round-trip (uniqueness, existence, in-use)
  live in the handler itself and return `Result.Failure` directly
  (docs/adr/0012); role/scope checks return `Forbid()`.
  `IUnitOfWork.SaveChangesAsync` (services-service) returns
  `PersistenceResult<int>` instead of throwing when a database
  unique-constraint race loses to a concurrent request — the handler
  checks `saveResult.IsFailure` and maps it via a per-entity
  `{Entity}PersistenceErrorMapper` (feature root, e.g.
  `Tags/TagPersistenceErrorMapper.cs`) to `Error.Conflict`, same outcome
  as the pre-emptive `NameExistsAsync` check. Delete handlers check this
  result too, even though nothing used to be caught there — discarding it
  would silently swallow a real conflict and report success.
  `identity-service`'s `IUnitOfWork.ExecuteInTransactionAsync` is already
  `Result`-aware; its `try/catch` exists only for transactional rollback
  on a genuinely unexpected failure, not to convert a business outcome —
  see "UnitOfWork" below.
- **`Admin.SharedKernel.AspNetCore.GenericExceptionHandler`** (`IExceptionHandler`,
  registered via `AddExceptionHandler<T>()` + `app.UseExceptionHandler()`
  in each `Program.cs`) is the *only* global exception handler in either
  service — it logs at Error level via `ILogger` and returns a generic
  500 Problem Details with no exception details in the body. There is no
  `BusinessExceptionHandler` anymore: nothing throws a business exception
  for it to catch. **Never reintroduce one** — see
  `agent-skills/agenza-exception-flow-audit` and
  `scripts/architecture_guard.py`, which both fail on
  `BusinessExceptionHandler`/`DuplicateEntityException` reappearing.

### FluentValidation

- One `<Operation>CommandValidator : AbstractValidator<TCommand>` per
  command that takes user input, checking **only** cheap, synchronous shape
  rules: required, length, format, numeric range, precision/scale
  (`.PrecisionScale(...)`), enum/palette membership, and cross-field
  comparisons within the same command (e.g. `min <= duration <= max`).
  **Validators take no repository dependencies** (docs/adr/0012,
  reverting docs/adr/0010) — a validator that needs a repository to do
  its job is a sign the check belongs in the handler instead. This means
  no `MustAsync`/`CustomAsync` rule ever calls a repository — if you see
  one, it's the reverted pattern; delete it and move the check into the
  handler (see `CreateTagCommandHandler`'s duplicate-name pre-check for
  the current shape).
- Cross-aggregate rules that need a repository round-trip — existence
  (Category/Tag/Service by id), uniqueness (duplicate name), in-use
  (Category/Tag referenced by a Service) — live in the **handler**, as
  plain `if (...) return Result.Failure(Error.NotFound(...)/Conflict(...))`
  checks before any persistence. See `CreateCategoryCommandHandler`/
  `UpdateCategoryCommandHandler`/`DeleteCategoryCommandHandler` for the
  simple case, and `CreateServiceCommandHandler`/`UpdateServiceCommandHandler`
  plus `Application/Services/ServiceRelationshipLoader.cs` for a
  multi-dependency case — the loader fetches Category/Tags exactly once and
  the handler reuses the same instances for both construction and the
  response, instead of fetching them again to build it.
- Runs automatically: the dispatcher resolves `IValidator<TCommand>` (if
  one is registered) and validates before calling the handler. A
  validation failure never reaches the handler.
- **Structured field errors, not one joined string:** `Dispatcher.ValidateAsync`
  groups every FluentValidation failure by `PropertyName` into
  `Error.FieldErrors` (`IReadOnlyDictionary<string, IReadOnlyList<FieldError>>`,
  each `FieldError` a `Code`+`Message` pair) instead of concatenating every
  message into one string. `ResultExtensions.ToActionResult` renders that as
  a structured `ProblemDetails` (`code` + a per-field `errors` map) so the
  front-end can map an error to the exact field without parsing free text —
  see docs/adr/0012.
- A validator with no `MustAsync`/`CustomAsync` rule at all can be tested
  with the synchronous `Validate(...)` again — none of the six
  Tag/Category/Service validators need `ValidateAsync` for this reason
  anymore, though using it is still harmless.

### UnitOfWork

- Defined **per service** in `Application/Abstractions/IUnitOfWork.cs` —
  not shared, because different services genuinely need different
  shapes (see docs/adr/0005). Match the shape to what the service's
  writes actually need:
  - Only ever writing through one `DbContext`? A
    `Task<PersistenceResult<int>> SaveChangesAsync(CancellationToken)` is
    enough (services-service) — `PersistenceResult`/`PersistenceError`
    (`Application/Abstractions/`) let Infrastructure report a recognized
    unique-constraint violation without throwing or referencing Npgsql
    from Application (docs/adr/0014). Repositories only stage changes
    (`Add`/`Remove`, no internal commit) — the handler commits explicitly
    and checks the returned result.
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
- **No integration tests, by decision** (docs/adr/0015): CI runs unit
  tests only — no Postgres, no Docker, no `WebApplicationFactory`.
  Api/Infrastructure (controllers, EF configurations/migrations,
  interceptors, exception handlers, auth/OIDC flows) have no automated
  coverage as a result — verify those manually (`dotnet run` + a real
  HTTP client) before merging a change that touches them.
- New endpoint = a unit test per new handler/validator; manually
  exercise auth (401/403) and the happy path before merging.

## Both must pass before every commit

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # unit tests only; coverage gate applied via Directory.Build.props/.targets
```

Also run the repo-wide governance checks from [../AGENTS.md](../AGENTS.md)
(`scripts/architecture_guard.py` in particular scans this directory for the
reverted exception patterns above).
