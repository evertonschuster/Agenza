using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.DeleteCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.DeleteCategory;

public class DeleteCategoryCommandHandlerTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<DeleteCategoryCommandHandler> _logger =
        Substitute.For<ILogger<DeleteCategoryCommandHandler>>();
    private readonly DeleteCategoryCommandHandler _handler;

    public DeleteCategoryCommandHandlerTests()
    {
        _serviceRepository.CountByCategoryIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(0);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new DeleteCategoryCommandHandler(_categoryRepository, _serviceRepository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithExistingUnusedCategory_RemovesItAndCommits()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var result = await _handler.Handle(new DeleteCategoryCommand(category.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _categoryRepository.Received(1).Remove(category);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(new DeleteCategoryCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
    }

    [Fact]
    public async Task Handle_WithCategoryInUse_ReturnsConflictAndDoesNotRemove()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _serviceRepository.CountByCategoryIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(3);

        var result = await _handler.Handle(new DeleteCategoryCommand(category.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Category.InUse");
        result.Error.Message.Should().Contain("3 serviço(s)");
        _categoryRepository.DidNotReceive().Remove(Arg.Any<Category>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentConflictAtSaveTime_ReturnsConflict()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new DeleteCategoryCommand(category.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }
}
