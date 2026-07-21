using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.DeleteCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.DeleteCategory;

public class DeleteCategoryCommandHandlerTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly DeleteCategoryCommandHandler _handler;

    public DeleteCategoryCommandHandlerTests()
    {
        _serviceRepository.CountByCategoryIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(0);
        _handler = new DeleteCategoryCommandHandler(_categoryRepository, _serviceRepository, _unitOfWork);
    }

    [Fact]
    public async Task Handle_WithExistingUnusedCategory_RemovesItAndCommits()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
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
        var category = new Category(Guid.NewGuid(), "Hair");
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
}
