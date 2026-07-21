using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.CreateCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.CreateCategory;

public class CreateCategoryCommandHandlerTests
{
    private readonly ICategoryRepository _repository = Substitute.For<ICategoryRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateCategoryCommandHandler> _logger =
        Substitute.For<ILogger<CreateCategoryCommandHandler>>();
    private readonly CreateCategoryCommandHandler _handler;

    public CreateCategoryCommandHandlerTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _handler = new CreateCategoryCommandHandler(_repository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheCategory()
    {
        var result = await _handler.Handle(new CreateCategoryCommand("Hair"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Hair");
        _repository.Received(1).Add(Arg.Is<Category>(category => category.Id == result.Value.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictAndDoesNotPersist()
    {
        _repository.NameExistsAsync("Hair", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(new CreateCategoryCommand("Hair"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateName");
        _repository.DidNotReceive().Add(Arg.Any<Category>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "IX_Categories_TenantId_NameNormalized"));

        var result = await _handler.Handle(new CreateCategoryCommand("Hair"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "some_other_unique_constraint"));

        var result = await _handler.Handle(new CreateCategoryCommand("Hair"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.DuplicateConflict");
    }
}
