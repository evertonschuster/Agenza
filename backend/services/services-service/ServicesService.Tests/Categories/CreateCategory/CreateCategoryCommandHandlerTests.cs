using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.CreateCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.CreateCategory;

public class CreateCategoryCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheCategory()
    {
        var repository = Substitute.For<ICategoryRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateCategoryCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new CreateCategoryCommand("Hair"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Hair");
        repository.Received(1).Add(Arg.Is<Category>(category => category.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
