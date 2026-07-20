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
- `ServicesService.Application/Tags/CreateTag/` — full command slice (Command/Handler/Validator/`CreateTagCommandExtensions.ToModel`)
- `ServicesService.Application/Tags/UpdateTag/` — same, plus `UpdateTagCommandExtensions.ApplyTo` (mutation-mapping shape)
- `ServicesService.Application/Tags/TagResponse.cs` — DTO shared across the feature's operations
- `ServicesService.Application/Abstractions/` — ports (`ITagRepository`, `IUnitOfWork`)
- `ServicesService.Api/Controllers/TagsController.cs` — direct command binding + Result → HTTP mapping (docs/adr/0007)
- `ServicesService.Tests/Tags/CreateTag/` — handler + validator unit tests
- `ServicesService.IntegrationTests/TagsEndpointTests.cs` — end-to-end HTTP tests

identity-service's `Tenants/ProvisionTenant/` slice is the second
reference — read it when the operation needs a database transaction
across more than one abstraction (see step 3's UnitOfWork note).

The "Copy-paste templates" section at the bottom of this file has the
full shape inline using a fictional `Widget`/`Widgets` example — for a
routine CRUD slice you shouldn't need to open the files above at all,
just adapt the templates.

## Build order (TDD — test first at each step)

### 1. Domain entity or value object

- If the entity does NOT belong to a tenant (rare — e.g. `Tenant` itself
  in identity-service), inherit `{Service}.Domain.Common.BaseEntity`
  directly — gives `Id`, `CreatedAt`/`CreatedBy`, `UpdatedAt`/
  `UpdatedBy`, `DeletedAt`/`DeletedBy`, `IsDeleted` for free
  (docs/adr/0006). Call `base(id)` from your constructor; never set the
  audit fields yourself, the EF interceptor does that.
- If the entity belongs to a tenant (the common case), inherit
  `{Service}.Domain.Common.TenantOwnedEntity` instead — it already
  inherits `BaseEntity` and implements `ITenantOwned` (`Guid TenantId
  { get; }` + `void AssignTenant(Guid tenantId)`) for you, so don't
  implement `ITenantOwned` or add an `AssignTenant` override on the
  entity itself. This is what lets the DbContext scope every query to it
  automatically (step 5) AND lets `AuditableEntitySaveChangesInterceptor`
  assign the tenant automatically on save (docs/adr/0008) — the
  constructor never takes a `tenantId` parameter at all; `TenantId`
  starts `Guid.Empty` and only `AssignTenant` (inherited) can set it,
  throwing the shared `InvalidTenantException` on empty (docs/adr/0009)
  — a missing tenant is a scoping bug, not a per-entity invariant, so
  there's nothing to override here. A mapping extension (step 3) is
  therefore parameterless too — it never threads a tenant id through.
- Constructor/factory validates every invariant; throw a dedicated
  exception inheriting that service's `{Service}.Domain.Exceptions.BusinessException`
  (`Code` + `Message`, e.g. `InvalidWidgetException(string message) :
  base("Widget.Invalid", message)`) — never a raw `Exception`/
  `ArgumentException`. Domain stays exception-based even though the rest
  of the stack uses Result — see docs/adr/0005 for why (zero project
  references; FluentValidation already checked shape by the time Domain
  runs) and docs/adr/0006 for the `BusinessException` shape. This is
  still the right default for a new entity in a new service. (Once a
  service's Domain rules end up fully duplicated in mature Create/Update
  validators, dropping the Domain-side throw becomes a reasonable,
  deliberate follow-up — see docs/adr/0011 for the one place this repo
  has done that so far, `services-service`'s `Tag`/`Category`/`Service`.
  Don't preemptively skip the throw here for a new entity.)
- No public setters. Add a `private` parameterless constructor ONLY if EF
  needs it, and keep it private.
- State changes go through named behavior methods (`Rename`, `Cancel`,
  `Reschedule`), each keeping the entity valid.
- Tests: plain xUnit + AwesomeAssertions, no mocks needed — Domain has
  zero dependencies. Cover `MarkCreated`/`MarkUpdated`/`MarkDeleted`
  (inherited from `BaseEntity`) and `AssignTenant` (if `ITenantOwned`)
  too — they count toward the coverage gate.

### 2. Port (interface) in `Application/Abstractions/`

- Narrow, intention-revealing methods (`Add`, `GetByIdAsync`) — not a
  generic interface. `Add`/`Remove` are synchronous and only stage the
  change (no internal commit) — see step 3's UnitOfWork note for why.
- If the entity is `ITenantOwned`, its methods do NOT take a tenant id
  parameter (`ListAsync(ct)`, `GetByIdAsync(id, ct)`) — the DbContext
  scopes the query automatically (step 5, docs/adr/0006). Only
  entities that aren't tenant-owned (like `Tenant` itself) pass an
  explicit id another way.
- The **implementation** (step 5) extends
  `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<TEntity>` for
  the Add/Remove/Find/List boilerplate underneath this interface
  (docs/adr/0006) — the port itself stays a plain, narrow interface.

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
- Validator (commands with user input only): shape rules (required,
  length, enum/palette membership) AND cross-aggregate rules needing a
  repository round-trip (uniqueness, existence) — the latter as async
  `MustAsync` rules, with the relevant repository interface(s)
  constructor-injected into the validator (docs/adr/0010). Handlers
  assume validated input and stay pure orchestration: fetch what's
  needed → construct/apply → persist → return — no inline existence/
  uniqueness `if` blocks. The dispatcher runs the validator automatically
  before the handler; don't call it yourself. Note: the dispatcher
  collapses every validator failure (shape or cross-aggregate) into a
  generic 400 `Error.Validation`, ignoring `.WithErrorCode(...)` — set
  it anyway, it's cheap and future-proofs a later Dispatcher change (see
  docs/adr/0010's accepted trade-off).
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
- If the handler constructs or mutates a domain entity from the
  command's fields, put that mapping in a `{Operation}CommandExtensions.cs`
  extension method beside the command (`ToModel(...)` for construction,
  `ApplyTo(entity)` for mutation) instead of inlining it in `Handle(...)`
  (docs/adr/0007) — see `CreateTagCommandExtensions`/`UpdateTagCommandExtensions`.

### 4. Unit tests with NSubstitute

- `Substitute.For<IPort>()` per port used by the handler — no hand-written
  fake classes (docs/adr/0006). Configure return values with
  `.Returns(...)`; assert interaction with `.Received(1).Method(...)` /
  `.DidNotReceive().Method(...)`.
- AwesomeAssertions, asserting on the `Result`: `result.IsSuccess`,
  `result.Value.Xyz`, `result.Error.Type.Should().Be(ErrorType.Conflict)`.
- Test the happy path plus any Domain-exception path the handler can
  still hit (e.g. an invalid rename) — a handler unit test calls
  `Handle(...)` directly, bypassing the validator, so it exercises paths
  production traffic never reaches. Existence/uniqueness failures are no
  longer handler-level concerns — test those on the validator instead.
- Add a validator test file too, using `await validator.ValidateAsync(command)`
  — **never the synchronous `Validate(...)`** if the validator has any
  `MustAsync` rule; FluentValidation throws
  `AsyncValidatorInvokedSynchronouslyException` even for a test that only
  exercises an unrelated sync rule. Construct the validator with
  NSubstitute repository fakes, stubbing the happy path as the default
  (`repository.NameExistsAsync(...).Returns(false)`,
  `repository.GetByIdAsync(...).Returns(someEntity)`) so pure shape-rule
  tests aren't tripped up by the async rule, then add dedicated tests for
  each `MustAsync` rule asserting `result.Errors` contains the expected
  `ErrorCode`.

### 5. Infrastructure adapter

- Repository extends `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<TEntity>`
  and implements the port, using the base's protected `FindAsync`/
  `ListAsync`/`AnyAsync`/`Add`/`Remove` (docs/adr/0006). `Add`/`Remove`
  only stage the change — no `SaveChangesAsync` inside the repository
  (the handler commits via `IUnitOfWork`).
- EF configuration lives in `Infrastructure/Persistence/Configurations/`.
  The soft-delete query filter and `DeletedAt` index apply automatically
  to every `BaseEntity`, and (if `ITenantOwned`) the tenant filter +
  `TenantId` index too — the `DbContext` calls
  `ApplyAuditableConventions(this, typeof(BaseEntity), typeof(ITenantOwned))`
  once (docs/adr/0006). If the entity is tenant-owned, the `DbContext`
  needs a public `CurrentTenantId` property (sourced from
  `ICurrentTenantProvider`) — the filter reads it off the live instance
  at query time, never bake a `Guid` value directly into the filter
  expression (EF Core caches the compiled model per `DbContext` type, so
  a baked-in constant leaks across every request regardless of the
  actual caller — see `ServicesDataContext`/docs/adr/0006). Never add
  `HasQueryFilter` by hand. If the entity has a uniqueness rule, filter
  that index with `.HasFilter("\"DeletedAt\" IS NULL")` so a soft-deleted
  row doesn't block reusing its unique value.
- If the entity is tenant-owned, also pass `ICurrentTenantProvider` into
  `AuditableEntitySaveChangesInterceptor`'s constructor (copy the
  existing wiring) so it can call `AssignTenant` on a newly added entity
  automatically (docs/adr/0008) — same DI registration you already added
  for the `DbContext`'s `CurrentTenantId`, nothing new to register.
- New tables → `dotnet ef migrations add <Name>` from the Api project
  directory (the service's tables live in its own schema —
  `HasDefaultSchema` is already set in the DbContext).

### 6. Controller (thin)

- Constructor-inject `IDispatcher` (never a concrete handler type) —
  nothing else, for a tenant-owned entity. The global `TenantHeaderFilter`
  (registered in `Program.cs`) already rejected the request with 403
  before this action runs unless the `X-Tenant-Id` header matched the
  token's `tenant_id` claim (docs/adr/0006); the tenant itself never
  needs to reach the controller at all — the DbContext scopes reads
  automatically and `AuditableEntitySaveChangesInterceptor` assigns the
  tenant automatically when a handler constructs a new entity
  (docs/adr/0008). Mark the controller/action `[IgnoreTenant]` instead if
  it genuinely isn't tenant-scoped (M2M, protocol endpoints).
- `[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/...")]` (or
  `internal/v{version:apiVersion}/...` for M2M-only routes).
- **Bind the command/query directly as the action parameter — don't
  declare a local `...Body` record** (docs/adr/0007). `[ApiController]`
  infers `[FromBody]` for a complex-type parameter automatically. A
  route id binds into its own `Guid id` parameter and gets merged into
  the command right before dispatching: `_dispatcher.Send(command with
  { WidgetId = id }, cancellationToken)` — the client's JSON body never
  carries the id, so the record's constructor gets `Guid.Empty` for it
  until the `with` expression overwrites it.
- Each action: `await _dispatcher.Send(...)` / `.Query(...)` →
  `result.ToActionResult(this, value => Ok(value))` (or `Created`/
  `NoContent`). No try/catch per exception type.
- `[Authorize]` by default; scope checks (`User.HasScope(...)`) for
  M2M-only endpoints (see `TenantsController`, which is also
  `[IgnoreTenant]`).

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

---

## Copy-paste templates

A fictional **Widget** entity in a fictional **Widgets** feature —
rename `Widget`/`Widgets`/`Create`/`Update`/`Delete`/`List` throughout
for your real feature/entity/operations, keep everything else. Assume
namespace root `{Service}` = your service's actual name
(`ServicesService`, `IdentityService`, ...).

### Command with a response (Create-shaped)

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed record CreateWidgetCommand(string Name) : ICommand<WidgetResponse>;
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandValidator.cs
using FluentValidation;
using {Service}.Application.Abstractions;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed class CreateWidgetCommandValidator : AbstractValidator<CreateWidgetCommand>
{
    public CreateWidgetCommandValidator(IWidgetRepository repository)
    {
        RuleFor(command => command.Name).NotEmpty().MaximumLength(Widget.NameMaxLength);

        // Delete this rule if the feature has no uniqueness rule.
        RuleFor(command => command.Name)
            .MustAsync(async (name, ct) => !await repository.NameExistsAsync(name, excludeId: null, ct))
            .WithErrorCode("Widget.DuplicateName")
            .WithMessage(command => $"A widget named '{command.Name}' already exists.");
    }
}
```

```csharp
// Domain/Exceptions/InvalidWidgetException.cs
namespace {Service}.Domain.Exceptions;

public class InvalidWidgetException : BusinessException
{
    public InvalidWidgetException(string message)
        : base("Widget.Invalid", message)
    {
    }
}
// BusinessException itself already exists per service
// ({Service}.Domain/Exceptions/BusinessException.cs) - copy it once, not
// per entity (docs/adr/0006).
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandExtensions.cs
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.CreateWidget;

// Command -> Domain mapping lives here, not inlined in the handler
// (docs/adr/0007). The constructor never takes a tenantId - TenantId
// starts Guid.Empty and AuditableEntitySaveChangesInterceptor assigns it
// on save (docs/adr/0008).
public static class CreateWidgetCommandExtensions
{
    public static Widget ToModel(this CreateWidgetCommand command) =>
        new(Guid.CreateVersion7(), command.Name);
}
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed class CreateWidgetCommandHandler : ICommandHandler<CreateWidgetCommand, WidgetResponse>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateWidgetCommandHandler(IWidgetRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<WidgetResponse>> Handle(CreateWidgetCommand command, CancellationToken cancellationToken)
    {
        var widget = command.ToModel();

        _repository.Add(widget);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return WidgetResponse.FromWidget(widget);
    }
}
```

No `ICurrentTenantProvider` needed in this handler at all — the tenant
is assigned automatically on save (docs/adr/0008). Only the `DbContext`
(query scoping) and `AuditableEntitySaveChangesInterceptor` (assignment)
need it; see step 5.

### Command with a response and a route id (Update-shaped)

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed record UpdateWidgetCommand(Guid WidgetId, string Name) : ICommand<WidgetResponse>;
```

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandValidator.cs
using FluentValidation;
using {Service}.Application.Abstractions;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed class UpdateWidgetCommandValidator : AbstractValidator<UpdateWidgetCommand>
{
    public UpdateWidgetCommandValidator(IWidgetRepository repository)
    {
        RuleFor(command => command.WidgetId).NotEmpty();

        RuleFor(command => command.WidgetId)
            .MustAsync(async (id, ct) => await repository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Widget.NotFound")
            .WithMessage(command => $"Widget '{command.WidgetId}' was not found.");

        RuleFor(command => command.Name).NotEmpty().MaximumLength(Widget.NameMaxLength);

        // Delete this rule if the feature has no uniqueness rule.
        RuleFor(command => command)
            .MustAsync(async (command, ct) => !await repository.NameExistsAsync(command.Name, command.WidgetId, ct))
            .WithErrorCode("Widget.DuplicateName")
            .WithMessage(command => $"A widget named '{command.Name}' already exists.")
            .OverridePropertyName(nameof(UpdateWidgetCommand.Name));
    }
}
// WidgetId is still validated even though it's route-sourced, not
// user-typed: the controller merges the route id in via `with` BEFORE
// dispatching (see the Controller template below), so by the time this
// validator runs, WidgetId already holds the real value.
```

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandExtensions.cs
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.UpdateWidget;

public static class UpdateWidgetCommandExtensions
{
    public static void ApplyTo(this UpdateWidgetCommand command, Widget widget) =>
        widget.Rename(command.Name);
}
```

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed class UpdateWidgetCommandHandler : ICommandHandler<UpdateWidgetCommand, WidgetResponse>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateWidgetCommandHandler(IWidgetRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<WidgetResponse>> Handle(UpdateWidgetCommand command, CancellationToken cancellationToken)
    {
        // Existence already guaranteed by UpdateWidgetCommandValidator.
        var widget = (await _repository.GetByIdAsync(command.WidgetId, cancellationToken))!;

        command.ApplyTo(widget);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return WidgetResponse.FromWidget(widget);
    }
}
```

### Command with no response (Delete-shaped)

```csharp
// Application/Widgets/DeleteWidget/DeleteWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.DeleteWidget;

public sealed record DeleteWidgetCommand(Guid WidgetId) : ICommand;
```

```csharp
// Application/Widgets/DeleteWidget/DeleteWidgetCommandHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.DeleteWidget;

public sealed class DeleteWidgetCommandHandler : ICommandHandler<DeleteWidgetCommand>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteWidgetCommandHandler(IWidgetRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteWidgetCommand command, CancellationToken cancellationToken)
    {
        var widget = await _repository.GetByIdAsync(command.WidgetId, cancellationToken);
        if (widget is null)
        {
            return Result.Failure(Error.NotFound("Widget.NotFound", $"Widget '{command.WidgetId}' was not found."));
        }

        _repository.Remove(widget);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
```

### Query (List/Get-shaped)

```csharp
// Application/Widgets/ListWidgets/ListWidgetsQuery.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.ListWidgets;

public sealed record ListWidgetsQuery : IQuery<IReadOnlyList<WidgetResponse>>;
```

```csharp
// Application/Widgets/ListWidgets/ListWidgetsQueryHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets;

namespace {Service}.Application.Widgets.ListWidgets;

public sealed class ListWidgetsQueryHandler : IQueryHandler<ListWidgetsQuery, IReadOnlyList<WidgetResponse>>
{
    private readonly IWidgetRepository _repository;

    public ListWidgetsQueryHandler(IWidgetRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<WidgetResponse>>> Handle(
        ListWidgetsQuery query, CancellationToken cancellationToken)
    {
        var widgets = await _repository.ListAsync(cancellationToken);
        IReadOnlyList<WidgetResponse> response = widgets.Select(WidgetResponse.FromWidget).ToList();
        return Result.Success(response);
    }
}
// No validator needed unless the query takes user input.
```

### Shared feature DTO (once per feature, not per operation)

```csharp
// Application/Widgets/WidgetResponse.cs
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets;

public sealed record WidgetResponse(Guid Id, string Name)
{
    public static WidgetResponse FromWidget(Widget widget) => new(widget.Id, widget.Name);
}
```

### Controller (dispatch + Result → HTTP)

```csharp
using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using {Service}.Application.Widgets.CreateWidget;
using {Service}.Application.Widgets.DeleteWidget;
using {Service}.Application.Widgets.ListWidgets;
using {Service}.Application.Widgets.UpdateWidget;

namespace {Service}.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/widgets")]
public class WidgetsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public WidgetsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    // Global TenantHeaderFilter (Program.cs) already rejected the
    // request with 403 unless X-Tenant-Id matched the token's
    // tenant_id claim (docs/adr/0006) - mark [IgnoreTenant] instead if
    // this controller/action genuinely isn't tenant-scoped.
    //
    // Every command below binds directly as the action parameter - no
    // local "...Body" record (docs/adr/0007). [ApiController] infers
    // [FromBody] for it automatically.

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new ListWidgetsQuery(), cancellationToken);
        return result.ToActionResult(this, widgets => Ok(widgets));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateWidgetCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, widget => Created($"/api/v1/widgets/{widget.Id}", widget));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateWidgetCommand command, CancellationToken cancellationToken)
    {
        // The route id, not the (empty) value the body deserialized -
        // WidgetId is never sent by the client, see docs/adr/0007.
        var result = await _dispatcher.Send(command with { WidgetId = id }, cancellationToken);
        return result.ToActionResult(this, widget => Ok(widget));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteWidgetCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
```

### Unit tests with NSubstitute (handler + validator)

```csharp
// Tests/Widgets/CreateWidget/CreateWidgetCommandHandlerTests.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets.CreateWidget;
using {Service}.Domain.Entities;
using {Service}.Domain.Exceptions;

namespace {Service}.Tests.Widgets.CreateWidget;

public class CreateWidgetCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheValue()
    {
        var repository = Substitute.For<IWidgetRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateWidgetCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new CreateWidgetCommand("Example"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Example");
        // TenantId stays Guid.Empty here - AuditableEntitySaveChangesInterceptor
        // assigns it on save, which this handler-level test never runs
        // (see AuditableEntitySaveChangesInterceptorTests for that, docs/adr/0008).
        repository.Received(1).Add(Arg.Is<Widget>(w => w.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidName_Throws()
    {
        // Only reachable if a caller bypasses CreateWidgetCommandValidator
        // - handler unit tests call Handle(...) directly, so they exercise
        // this path even though production traffic never does.
        var handler = new CreateWidgetCommandHandler(Substitute.For<IWidgetRepository>(), Substitute.For<IUnitOfWork>());

        var act = () => handler.Handle(new CreateWidgetCommand(""), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidWidgetException>();
    }
}
```

```csharp
// Tests/Widgets/CreateWidget/CreateWidgetCommandValidatorTests.cs
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets.CreateWidget;

namespace {Service}.Tests.Widgets.CreateWidget;

public class CreateWidgetCommandValidatorTests
{
    private readonly IWidgetRepository _repository = Substitute.For<IWidgetRepository>();
    private readonly CreateWidgetCommandValidator _validator;

    public CreateWidgetCommandValidatorTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new CreateWidgetCommandValidator(_repository);
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await _validator.ValidateAsync(new CreateWidgetCommand("Example"))).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        (await _validator.ValidateAsync(new CreateWidgetCommand(""))).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDuplicateName_FailsWithDuplicateNameErrorCode()
    {
        _repository.NameExistsAsync("Example", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new CreateWidgetCommand("Example"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Widget.DuplicateName");
    }
}
```

```csharp
// Tests/Widgets/UpdateWidget/UpdateWidgetCommandHandlerTests.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets.UpdateWidget;
using {Service}.Domain.Entities;

namespace {Service}.Tests.Widgets.UpdateWidget;

public class UpdateWidgetCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var widget = new Widget(Guid.NewGuid(), "Old Name");
        var repository = Substitute.For<IWidgetRepository>();
        repository.GetByIdAsync(widget.Id, Arg.Any<CancellationToken>()).Returns(widget);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateWidgetCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new UpdateWidgetCommand(widget.Id, "New Name"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("New Name");
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
// Existence/uniqueness failures (Widget.NotFound/Widget.DuplicateName)
// are no longer handler-level outcomes - they're covered by
// UpdateWidgetCommandValidatorTests below instead.
```

```csharp
// Tests/Widgets/UpdateWidget/UpdateWidgetCommandValidatorTests.cs
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets.UpdateWidget;
using {Service}.Domain.Entities;

namespace {Service}.Tests.Widgets.UpdateWidget;

public class UpdateWidgetCommandValidatorTests
{
    private readonly IWidgetRepository _repository = Substitute.For<IWidgetRepository>();
    private readonly UpdateWidgetCommandValidator _validator;
    private readonly Guid _widgetId = Guid.NewGuid();

    public UpdateWidgetCommandValidatorTests()
    {
        var widget = new Widget(_widgetId, "Old Name");
        _repository.GetByIdAsync(_widgetId, Arg.Any<CancellationToken>()).Returns(widget);
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new UpdateWidgetCommandValidator(_repository);
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await _validator.ValidateAsync(new UpdateWidgetCommand(_widgetId, "New Name"))).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        (await _validator.ValidateAsync(new UpdateWidgetCommand(_widgetId, ""))).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithUnknownWidgetId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Widget?)null);

        var result = await _validator.ValidateAsync(new UpdateWidgetCommand(unknownId, "New Name"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Widget.NotFound");
    }

    [Fact]
    public async Task Validate_RenamingToAnotherWidgetsName_FailsWithDuplicateNameErrorCode()
    {
        _repository.NameExistsAsync("New Name", _widgetId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new UpdateWidgetCommand(_widgetId, "New Name"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Widget.DuplicateName");
    }
}
```

### Regression test for automatic tenant assignment (EF Core InMemory, no Docker)

Only needed once per service, the first time it gets a tenant-owned
entity — not per feature. Copy
`ServicesService.IntegrationTests/AuditableEntitySaveChangesInterceptorTests.cs`
verbatim (rename the fake tenant provider/entity as needed): it wires
the real `AuditableEntitySaveChangesInterceptor` against an
`UseInMemoryDatabase` context and proves three things docs/adr/0008
depends on — a newly added entity with `TenantId == Guid.Empty` gets
the current tenant assigned on save, saving with no tenant available
throws instead of persisting a tenant-less row, and an entity
constructed with an explicit tenant is left alone.

### Integration test (real HTTP, real Postgres)

Replace `WidgetApiFactory` with whatever this service's own factory is
actually called (`ServicesApiFactory`, `IdentityApiFactory`, ...) — see
`ServicesApiFactory`/`TestAuthHandler` if this service doesn't exist yet.

```csharp
// IntegrationTests/WidgetsEndpointTests.cs
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace {Service}.IntegrationTests;

public class WidgetsEndpointTests : IClassFixture<WidgetApiFactory>
{
    private const string Url = "/api/v1/widgets";
    private readonly WidgetApiFactory _factory;

    public WidgetsEndpointTests(WidgetApiFactory factory) => _factory = factory;

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(Url);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_with_an_empty_name_is_rejected_by_validation()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        var response = await client.PostAsJsonAsync(Url, new { name = "" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_then_list_round_trips()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var createResponse = await client.PostAsJsonAsync(Url, new { name = "Example" });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var listResponse = await client.GetAsync(Url);
        (await listResponse.Content.ReadFromJsonAsync<JsonElement[]>())
            .Should().Contain(item => item.GetProperty("name").GetString() == "Example");
    }

    private HttpClient AuthenticatedClient(Guid tenantId)
    {
        // If this service IS the OIDC provider, get a real token instead - see ProvisioningEndpointTests.RequestTokenAsync.
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tenantId.ToString());

        // TenantHeaderFilter requires this to match the token's tenant_id
        // claim (docs/adr/0006) - omit it entirely for an M2M-only test
        // client that carries no tenant claim.
        client.DefaultRequestHeaders.Add("X-Tenant-Id", tenantId.ToString());

        return client;
    }
}
```
