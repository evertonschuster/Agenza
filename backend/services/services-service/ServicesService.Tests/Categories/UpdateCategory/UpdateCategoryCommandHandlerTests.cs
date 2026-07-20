using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.UpdateCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.UpdateCategory;

public class UpdateCategoryCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        var repository = Substitute.For<ICategoryRepository>();
        repository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateCategoryCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateCategoryCommand(category.Id, "Nails"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Nails");
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
