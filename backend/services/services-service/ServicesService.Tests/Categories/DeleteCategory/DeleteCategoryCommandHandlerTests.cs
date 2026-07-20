using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.DeleteCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.DeleteCategory;

public class DeleteCategoryCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingCategory_RemovesItAndCommits()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        var repository = Substitute.For<ICategoryRepository>();
        repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteCategoryCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteCategoryCommand(category.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(category);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
