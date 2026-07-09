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
// Application/Widgets/CreateWidget/CreateWidgetCommandHandler.cs
using Admin.SharedKernel;
using {Service}.Application.Abstractions;
using {Service}.Domain.Entities;
using {Service}.Domain.Exceptions;

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
        Widget widget;
        try
        {
            // Construct/validate via the domain first - it normalizes
            // (trims, etc.) so the uniqueness check below runs against
            // the value that would actually be persisted.
            widget = new Widget(Guid.NewGuid(), command.TenantId, command.Name);
        }
        catch (InvalidWidgetException exception)
        {
            // Reached only if a caller bypasses CreateWidgetCommandValidator
            // - the validator already rejects malformed shape before this
            // handler runs (docs/adr/0005).
            return Result.Failure<WidgetResponse>(Error.Validation("Widget.Invalid", exception.Message));
        }

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

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid(); // authenticated but not tenant-bound (e.g. an M2M token)
        }

        var result = await _dispatcher.Query(new ListWidgetsQuery(tenantId), cancellationToken);
        return result.ToActionResult(this, widgets => Ok(widgets));
    }

    [HttpPost]
    public async Task<IActionResult> Create(WidgetBody body, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        var result = await _dispatcher.Send(new CreateWidgetCommand(tenantId, body.Name), cancellationToken);
        return result.ToActionResult(this, widget => Created($"/api/v1/widgets/{widget.Id}", widget));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        var result = await _dispatcher.Send(new DeleteWidgetCommand(tenantId, id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
```

### Fakes + unit tests (handler + validator)

```csharp
// Tests/TestDoubles/FakeWidgetRepository.cs
using {Service}.Application.Abstractions;
using {Service}.Domain.Entities;

namespace {Service}.Tests.TestDoubles;

public class FakeWidgetRepository : IWidgetRepository
{
    public List<Widget> Items { get; } = [];

    public Task<IReadOnlyList<Widget>> ListAsync(Guid tenantId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Widget>>(Items.Where(i => i.TenantId == tenantId).ToList());

    public Task<Widget?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken) =>
        Task.FromResult(Items.FirstOrDefault(i => i.TenantId == tenantId && i.Id == id));

    public Task<bool> NameExistsAsync(Guid tenantId, string name, Guid? excludeId, CancellationToken cancellationToken) =>
        Task.FromResult(Items.Any(i => i.TenantId == tenantId
            && string.Equals(i.Name, name.Trim(), StringComparison.OrdinalIgnoreCase)
            && (excludeId is null || i.Id != excludeId)));

    public void Add(Widget item) => Items.Add(item);
    public void Remove(Widget item) => Items.Remove(item);
}
```

```csharp
// Tests/TestDoubles/FakeUnitOfWork.cs (skip if the service already has one)
using {Service}.Application.Abstractions;

namespace {Service}.Tests.TestDoubles;

public class FakeUnitOfWork : IUnitOfWork
{
    public int SaveChangesCalls { get; private set; }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        SaveChangesCalls++;
        return Task.FromResult(0);
    }
}
```

```csharp
// Tests/Widgets/CreateWidget/CreateWidgetCommandHandlerTests.cs
using Admin.SharedKernel;
using {Service}.Application.Widgets.CreateWidget;
using {Service}.Domain.Entities;
using {Service}.Tests.TestDoubles;

namespace {Service}.Tests.Widgets.CreateWidget;

public class CreateWidgetCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheValue()
    {
        var repository = new FakeWidgetRepository();
        var unitOfWork = new FakeUnitOfWork();
        var handler = new CreateWidgetCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateWidgetCommand(Guid.NewGuid(), "Example"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Example");
        unitOfWork.SaveChangesCalls.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithDuplicateNameInSameTenant_ReturnsConflict()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeWidgetRepository();
        repository.Items.Add(new Widget(Guid.NewGuid(), tenantId, "Example"));
        var handler = new CreateWidgetCommandHandler(repository, new FakeUnitOfWork());

        var result = await handler.Handle(
            new CreateWidgetCommand(tenantId, "example"), CancellationToken.None); // case-insensitive match

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
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
        return client;
    }
}
```
