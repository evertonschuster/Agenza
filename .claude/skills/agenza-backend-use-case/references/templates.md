# Backend use-case templates

Read this before writing any new command, query, entity, controller, or
test for a backend vertical slice — see [../SKILL.md](../SKILL.md) for the
decision tree, prohibitions, and build order these templates implement.

A fictional **Widget** entity in a fictional **Widgets** feature — this is
a direct copy of Tags' current shape (see the reference files in SKILL.md),
renamed. Assume namespace root `{Service}` = your service's actual name.

## Command with a response (Create-shaped)

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed record CreateWidgetCommand(string Name) : ICommand<WidgetResponse>;
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandValidator.cs
using FluentValidation;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed class CreateWidgetCommandValidator : AbstractValidator<CreateWidgetCommand>
{
    public CreateWidgetCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(Widget.NameMaxLength);
    }
}
```

```csharp
// Domain/Entities/Widget.cs
using {Service}.Domain.Common;

namespace {Service}.Domain.Entities;

public class Widget : TenantOwnedEntity
{
    public const int NameMaxLength = 80;

    public string Name { get; private set; }

    private Widget()
    {
        Name = string.Empty; // EF Core materialization only.
    }

    private Widget(Guid id, string name)
        : base(id)
    {
        Name = name;
    }

    public static DomainResult<Widget> Create(Guid id, string name)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<Widget>(nameResult.Error);
        }

        return DomainResult.Success(new Widget(id, nameResult.Value));
    }

    public DomainResult Update(string name)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure(nameResult.Error);
        }

        Name = nameResult.Value;

        return DomainResult.Success();
    }

    private static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Widget.Invalid",
                $"Name is required and must be at most {NameMaxLength} characters."));
        }

        return DomainResult.Success(trimmed);
    }
}
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandExtensions.cs
using {Service}.Domain.Common;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.CreateWidget;

public static class CreateWidgetCommandExtensions
{
    public static DomainResult<Widget> ToModel(this CreateWidgetCommand command) =>
        Widget.Create(Guid.CreateVersion7(), command.Name);
}
```

```csharp
// Application/Widgets/WidgetPersistenceErrorMapper.cs
using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets;

public static class WidgetPersistenceErrorMapper
{
    private const string NameConstraint = "IX_Widgets_TenantId_NameNormalized";

    public static Error Map(PersistenceError error, string name, ILogger logger)
    {
        if (error.ConstraintName == NameConstraint)
        {
            return Error.Conflict("Widget.DuplicateName", $"A widget named '{name}' already exists.");
        }

        logger.LogError(
            "Unrecognized unique constraint {ConstraintName} violated while saving a Widget",
            error.ConstraintName);
        return Error.Conflict("Widget.DuplicateConflict", "Could not save the widget due to a data conflict.");
    }
}
```

```csharp
// Application/Widgets/CreateWidget/CreateWidgetCommandHandler.cs
using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.CreateWidget;

public sealed class CreateWidgetCommandHandler : ICommandHandler<CreateWidgetCommand, WidgetResponse>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateWidgetCommandHandler> _logger;

    public CreateWidgetCommandHandler(
        IWidgetRepository repository, IUnitOfWork unitOfWork, ILogger<CreateWidgetCommandHandler> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<WidgetResponse>> Handle(CreateWidgetCommand command, CancellationToken cancellationToken)
    {
        if (await _repository.NameExistsAsync(command.Name, excludeId: null, cancellationToken))
        {
            return Result.Failure<WidgetResponse>(
                Error.Conflict("Widget.DuplicateName", $"A widget named '{command.Name}' already exists."));
        }

        var widgetResult = command.ToModel();
        if (widgetResult.IsFailure)
        {
            return Result.Failure<WidgetResponse>(widgetResult.Error.ToApplicationError());
        }

        var widget = widgetResult.Value;
        _repository.Add(widget);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<WidgetResponse>(WidgetPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return WidgetResponse.FromWidget(widget);
    }
}
```

No `ICurrentTenantProvider` needed in this handler at all — the tenant
is assigned automatically on save (docs/adr/0008). Only the `DbContext`
(query scoping) and `AuditableEntitySaveChangesInterceptor` (assignment)
need it; see SKILL.md's step 5.

## Command with a response and a route id (Update-shaped)

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed record UpdateWidgetCommand(Guid WidgetId, string Name) : ICommand<WidgetResponse>;
```

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandValidator.cs
using FluentValidation;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed class UpdateWidgetCommandValidator : AbstractValidator<UpdateWidgetCommand>
{
    public UpdateWidgetCommandValidator()
    {
        RuleFor(command => command.WidgetId).NotEmpty();

        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(Widget.NameMaxLength);
    }
}
```

Cross-aggregate rules (existence, uniqueness) never live in the validator —
that's the handler's job below. `WidgetId` is still shape-validated even
though it's route-sourced: the controller merges the route id in via
`with` BEFORE dispatching (see the Controller template below).

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandExtensions.cs
using {Service}.Domain.Common;
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets.UpdateWidget;

public static class UpdateWidgetCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateWidgetCommand command, Widget widget) =>
        widget.Update(command.Name);
}
```

```csharp
// Application/Widgets/UpdateWidget/UpdateWidgetCommandHandler.cs
using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.UpdateWidget;

public sealed class UpdateWidgetCommandHandler : ICommandHandler<UpdateWidgetCommand, WidgetResponse>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateWidgetCommandHandler> _logger;

    public UpdateWidgetCommandHandler(
        IWidgetRepository repository, IUnitOfWork unitOfWork, ILogger<UpdateWidgetCommandHandler> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<WidgetResponse>> Handle(UpdateWidgetCommand command, CancellationToken cancellationToken)
    {
        var widget = await _repository.GetByIdAsync(command.WidgetId, cancellationToken);
        if (widget is null)
        {
            return Result.Failure<WidgetResponse>(
                Error.NotFound("Widget.NotFound", $"Widget '{command.WidgetId}' was not found."));
        }

        if (await _repository.NameExistsAsync(command.Name, command.WidgetId, cancellationToken))
        {
            return Result.Failure<WidgetResponse>(
                Error.Conflict("Widget.DuplicateName", $"A widget named '{command.Name}' already exists."));
        }

        var applyResult = command.ApplyTo(widget);
        if (applyResult.IsFailure)
        {
            return Result.Failure<WidgetResponse>(applyResult.Error.ToApplicationError());
        }

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<WidgetResponse>(WidgetPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return WidgetResponse.FromWidget(widget);
    }
}
```

## Command with no response (Delete-shaped)

```csharp
// Application/Widgets/DeleteWidget/DeleteWidgetCommand.cs
using Admin.SharedKernel;

namespace {Service}.Application.Widgets.DeleteWidget;

public sealed record DeleteWidgetCommand(Guid WidgetId) : ICommand;
```

```csharp
// Application/Widgets/DeleteWidget/DeleteWidgetCommandHandler.cs
using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using {Service}.Application.Abstractions;

namespace {Service}.Application.Widgets.DeleteWidget;

public sealed class DeleteWidgetCommandHandler : ICommandHandler<DeleteWidgetCommand>
{
    private readonly IWidgetRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteWidgetCommandHandler> _logger;

    public DeleteWidgetCommandHandler(
        IWidgetRepository repository, IUnitOfWork unitOfWork, ILogger<DeleteWidgetCommandHandler> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteWidgetCommand command, CancellationToken cancellationToken)
    {
        var widget = await _repository.GetByIdAsync(command.WidgetId, cancellationToken);
        if (widget is null)
        {
            return Result.Failure(Error.NotFound("Widget.NotFound", $"Widget '{command.WidgetId}' was not found."));
        }

        _repository.Remove(widget);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure(WidgetPersistenceErrorMapper.Map(saveResult.Error, widget.Name, _logger));
        }

        return Result.Success();
    }
}
```

## Query (List/Get-shaped)

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
```

No validator needed unless the query takes user input.

## Shared feature DTO (once per feature, not per operation)

```csharp
// Application/Widgets/WidgetResponse.cs
using {Service}.Domain.Entities;

namespace {Service}.Application.Widgets;

public sealed record WidgetResponse(Guid Id, string Name)
{
    public static WidgetResponse FromWidget(Widget widget) => new(widget.Id, widget.Name);
}
```

## Controller (dispatch + Result → HTTP)

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

## Unit tests with NSubstitute (handler + validator)

```csharp
// Tests/Widgets/CreateWidget/CreateWidgetCommandHandlerTests.cs
using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using {Service}.Application.Abstractions;
using {Service}.Application.Widgets.CreateWidget;
using {Service}.Domain.Entities;

namespace {Service}.Tests.Widgets.CreateWidget;

public class CreateWidgetCommandHandlerTests
{
    private readonly IWidgetRepository _repository = Substitute.For<IWidgetRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateWidgetCommandHandler> _logger = Substitute.For<ILogger<CreateWidgetCommandHandler>>();
    private readonly CreateWidgetCommandHandler _handler;

    public CreateWidgetCommandHandlerTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>()).Returns(false);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new CreateWidgetCommandHandler(_repository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheValue()
    {
        var result = await _handler.Handle(new CreateWidgetCommand("Example"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Example");
        _repository.Received(1).Add(Arg.Is<Widget>(w => w.Id == result.Value.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictWithoutPersisting()
    {
        _repository.NameExistsAsync("Example", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(new CreateWidgetCommand("Example"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Widget.DuplicateName");
        _repository.DidNotReceive().Add(Arg.Any<Widget>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidName_ReturnsFailure()
    {
        var result = await _handler.Handle(new CreateWidgetCommand(""), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Widget.Invalid");
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
        _validator.Validate(new CreateWidgetCommand("Example")).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyName_Fails()
    {
        _validator.Validate(new CreateWidgetCommand("")).IsValid.Should().BeFalse();
    }
}
```

No repository fake needed - the validator takes no dependencies.
Duplicate-name coverage lives in `CreateWidgetCommandHandlerTests` instead.

## Automatic tenant assignment has no automated regression test

`{Service}.Tests` references only Domain + Application (mocked ports, no
EF Core) — deliberately, to keep the unit-test tier free of Infrastructure/
EF dependencies (docs/adr/0015). This means the
`AuditableEntitySaveChangesInterceptor` behavior docs/adr/0008 depends on —
a newly added entity with `TenantId == Guid.Empty` gets the current tenant
assigned on save — has no automated coverage. The first time a service
gets a tenant-owned entity, manually verify this by running the service
and creating a record through its API, confirming the persisted row's
`TenantId` matches the caller's tenant.
