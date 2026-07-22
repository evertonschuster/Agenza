using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.UpdateCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.UpdateCategory;

public class UpdateCategoryCommandHandlerTests
{
    private readonly ICategoryRepository _repository = Substitute.For<ICategoryRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<UpdateCategoryCommandHandler> _logger =
        Substitute.For<ILogger<UpdateCategoryCommandHandler>>();
    private readonly UpdateCategoryCommandHandler _handler;

    public UpdateCategoryCommandHandlerTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new UpdateCategoryCommandHandler(_repository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var result = await _handler.Handle(
            new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Nails");
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(new UpdateCategoryCommand(unknownId, "Hair"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_RenamingToAnotherCategorysName_ReturnsConflict()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _repository.NameExistsAsync("Nails", category.Id, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateName");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_LoadsTheCategoryExactlyOnce()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        await _handler.Handle(new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        await _repository.Received(1).GetByIdAsync(category.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Categories_TenantId_NameNormalized")));

        var result = await _handler.Handle(new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateConflict");
    }
}
