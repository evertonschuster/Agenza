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

The "Copy-paste templates" section at the bottom of this file has the
full shape inline using a fictional `Widget`/`Widgets` example — for a
routine CRUD slice you shouldn't need to open the files above at all,
just adapt the templates.

## Build order (TDD — test first at each step)

### 1. Domain entity or value object

- Inherit `{Service}.Domain.Common.BaseEntity` — gives `Id`,
  `CreatedAt`/`CreatedBy`, `UpdatedAt`/`UpdatedBy`, `DeletedAt`/
  `DeletedBy`, `IsDeleted` for free (docs/adr/0006). Call `base(id)` from
  your constructor; never set the audit fields yourself, the EF
  interceptor does that.
- Constructor/factory validates every invariant; throw a dedicated
  exception inheriting that service's `{Service}.Domain.Exceptions.BusinessException`
  (`Code` + `Message`, e.g. `InvalidWidgetException(string message) :
  base("Widget.Invalid", message)`) — never a raw `Exception`/
  `ArgumentException`. Domain stays exception-based even though the rest
  of the stack uses Result — see docs/adr/0005 for why (zero project
  references; FluentValidation already checked shape by the time Domain
  runs) and docs/adr/0006 for the `BusinessException` shape.
- No public setters. Add a `private` parameterless constructor ONLY if EF
  needs it, and keep it private.
- State changes go through named behavior methods (`Rename`, `Cancel`,
  `Reschedule`), each keeping the entity valid.
- Tests: plain xUnit + AwesomeAssertions, no mocks needed — Domain has
  zero dependencies. Cover `MarkCreated`/`MarkUpdated`/`MarkDeleted` too
  (inherited from `BaseEntity`) — they count toward the coverage gate.

### 2. Port (interface) in `Application/Abstractions/`

- Narrow, intention-revealing methods (`Add`, `GetByIdAsync`) — not a
  generic interface. `Add`/`Remove` are synchronous and only stage the
  change (no internal commit) — see step 3's UnitOfWork note for why.
- Every method that touches tenant-owned data takes the tenant id (or an
  aggregate that carries it) explicitly, plus a `CancellationToken`.
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

### 4. Unit tests with NSubstitute

- `Substitute.For<IPort>()` per port used by the handler — no hand-written
  fake classes (docs/adr/0006). Configure return values with
  `.Returns(...)`; assert interaction with `.Received(1).Method(...)` /
  `.DidNotReceive().Method(...)`.
- AwesomeAssertions, asserting on the `Result`: `result.IsSuccess`,
  `result.Value.Xyz`, `result.Error.Type.Should().Be(ErrorType.Conflict)`.
- Test the happy path AND every failure path (validation, not-found,
  conflict) — each should return the right `ErrorType`, never throw.
- Add a small validator test file too (`AbstractValidator.Validate(...)`
  directly, no DI needed) covering each rule's pass/fail case.

### 5. Infrastructure adapter

- Repository extends `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<TEntity>`
  and implements the port, using the base's protected `FindAsync`/
  `ListAsync`/`AnyAsync`/`Add`/`Remove` for the boilerplate underneath
  your tenant-scoped public methods (docs/adr/0006). `Add`/`Remove` only
  stage the change — no `SaveChangesAsync` inside the repository (the
  handler commits via `IUnitOfWork`).
- EF configuration lives in `Infrastructure/Persistence/Configurations/`.
  The soft-delete query filter and `DeletedAt` index apply automatically
  to every `BaseEntity` (the `DbContext` calls `ApplyAuditableConventions`
  once, docs/adr/0006) — don't add `HasQueryFilter` by hand. If the
  entity has a uniqueness rule, filter that index with
  `.HasFilter("\"DeletedAt\" IS NULL")` so a soft-deleted row doesn't
  block reusing its unique value.
- New tables → `dotnet ef migrations add <Name>` from the Api project
  directory (the service's tables live in its own schema —
  `HasDefaultSchema` is already set in the DbContext).

### 6. Controller (thin)

- Constructor-inject `IDispatcher` (never a concrete handler type) and
  `ITenantAccessor` (from `shared/Admin.Identity.Client`) when the route
  is tenant-scoped.
- `[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/...")]` (or
  `internal/v{version:apiVersion}/...` for M2M-only routes).
- Don't check the tenant yourself — the global `TenantHeaderFilter`
  (registered in `Program.cs`) already rejected the request with 403
  before this action runs unless the `X-Tenant-Id` header matched the
  token's `tenant_id` claim (docs/adr/0006). Just read
  `_tenantAccessor.TenantId` (the throwing property, not
  `TryGetTenantId`). Mark the controller/action `[IgnoreTenant]` instead
  if it genuinely isn't tenant-scoped (M2M, protocol endpoints).
- Each action: build the command/query with `_tenantAccessor.TenantId` →
  `await _dispatcher.Send(...)` / `.Query(...)` →
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

### Command with a response (Create/Update-shaped)

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed record CreateWidgetCommand(Guid TenantId, string Name) : ICommand<WidgetResponse>;
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandValidator.cs
using FluentValidation;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.CreateWidget;

// Shape only - cheap, synchronous rules. NOT the cross-aggregate rule
// (uniqueness/existence) - that needs the repository, so it lives in
// the handler below, not here.
public sealed class CreateWidgetCommandValidator : AbstractValidator<CreateWidgetCommand>
{
    public CreateWidgetCommandValidator()
    {
        RuleFor(command => command.Name).NotEmpty().MaximumLength(Widget.NameMaxLength);
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
// Application/Widgets/CreateWidget/CreateWidgetCommandHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;
using {Service}.Domain.Entities;

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
        // Construction can throw InvalidWidgetException (a
        // BusinessException) if a caller bypasses
        // CreateWidgetCommandValidator - left uncaught on purpose, the
        // Api's global BusinessExceptionHandler maps it to a 400 Problem
        // Details response (docs/adr/0006). Never wrap this in try/catch.
        var widget = new Widget(Guid.CreateVersion7(), command.TenantId, command.Name);

        // Cross-aggregate rule needing the repository - delete this
        // block if the feature has no uniqueness rule:
        if (await _repository.NameExistsAsync(command.TenantId, widget.Name, excludeId: null, cancellationToken))
        {
            return Result.Failure<WidgetResponse>(
                Error.Conflict("Widget.DuplicateName", $"A widget named '{widget.Name}' already exists."));
        }

        _repository.Add(widget);
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

public sealed record DeleteWidgetCommand(Guid TenantId, Guid WidgetId) : ICommand;
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
        var widget = await _repository.GetByIdAsync(command.TenantId, command.WidgetId, cancellationToken);
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

public sealed record ListWidgetsQuery(Guid TenantId) : IQuery<IReadOnlyList<WidgetResponse>>;
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
        var widgets = await _repository.ListAsync(query.TenantId, cancellationToken);
        IReadOnlyList<WidgetResponse> response = widgets.Select(WidgetResponse.FromWidget).ToList();
        return Result.Success(response);
    }
}
// No validator needed unless the query takes user input beyond the tenant id.
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
using Admin.Identity.Client;
using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using {Service}.Application.Widgets.CreateWidget;
using {Service}.Application.Widgets.DeleteWidget;
using {Service}.Application.Widgets.ListWidgets;

namespace {Service}.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/widgets")]
public class WidgetsController : ControllerBase
{
    private readonly ITenantAccessor _tenantAccessor;
    private readonly IDispatcher _dispatcher;

    public WidgetsController(ITenantAccessor tenantAccessor, IDispatcher dispatcher)
    {
        _tenantAccessor = tenantAccessor;
        _dispatcher = dispatcher;
    }

    public record WidgetBody(string Name);

    // No TryGetTenantId/Forbid boilerplate: the global TenantHeaderFilter
    // (Program.cs) already rejected the request with 403 before this
    // action runs unless X-Tenant-Id matched the token's tenant_id claim
    // (docs/adr/0006). Mark this controller/action [IgnoreTenant] instead
    // if it genuinely isn't tenant-scoped.

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new ListWidgetsQuery(_tenantAccessor.TenantId), cancellationToken);
        return result.ToActionResult(this, widgets => Ok(widgets));
    }

    [HttpPost]
    public async Task<IActionResult> Create(WidgetBody body, CancellationToken cancellationToken)
    {
        var command = new CreateWidgetCommand(_tenantAccessor.TenantId, body.Name);
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, widget => Created($"/api/v1/widgets/{widget.Id}", widget));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var command = new DeleteWidgetCommand(_tenantAccessor.TenantId, id);
        var result = await _dispatcher.Send(command, cancellationToken);
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
        var tenantId = Guid.NewGuid();
        var repository = Substitute.For<IWidgetRepository>();
        repository.NameExistsAsync(tenantId, "Example", null, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateWidgetCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateWidgetCommand(tenantId, "Example"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Example");
        repository.Received(1).Add(Arg.Is<Widget>(w => w.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateNameInSameTenant_ReturnsConflict()
    {
        var tenantId = Guid.NewGuid();
        var repository = Substitute.For<IWidgetRepository>();
        repository.NameExistsAsync(tenantId, "example", null, Arg.Any<CancellationToken>()).Returns(true);
        var handler = new CreateWidgetCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new CreateWidgetCommand(tenantId, "example"), CancellationToken.None); // case-insensitive match

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }

    [Fact]
    public async Task Handle_WithInvalidName_Throws()
    {
        // Only reachable if a caller bypasses CreateWidgetCommandValidator
        // - handler unit tests call Handle(...) directly, so they exercise
        // this path even though production traffic never does.
        var handler = new CreateWidgetCommandHandler(
            Substitute.For<IWidgetRepository>(), Substitute.For<IUnitOfWork>());

        var act = () => handler.Handle(new CreateWidgetCommand(Guid.NewGuid(), ""), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidWidgetException>();
    }
}
```

```csharp
// Tests/Widgets/CreateWidget/CreateWidgetCommandValidatorTests.cs
using {Service}.Application.Widgets.CreateWidget;

namespace {Service}.Tests.Widgets.CreateWidget;

public class CreateWidgetCommandValidatorTests
{
    private readonly CreateWidgetCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        _validator.Validate(new CreateWidgetCommand(Guid.NewGuid(), "Example")).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyName_Fails()
    {
        _validator.Validate(new CreateWidgetCommand(Guid.NewGuid(), "")).IsValid.Should().BeFalse();
    }
}
```

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
        // If this service IS the OIDC provider (identity-service), get a
        // real client-credentials token instead - see
        // ProvisioningEndpointTests.RequestTokenAsync.
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
