using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.ListCategories;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.ListCategories;

public class ListCategoriesQueryHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsCategoriesFromTheRepository()
    {
        var repository = Substitute.For<ICategoryRepository>();
        repository.ListAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { new Category(Guid.NewGuid(), "Hair") });
        var handler = new ListCategoriesQueryHandler(repository);

        var result = await handler.Handle(new ListCategoriesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("Hair");
    }

    [Fact]
    public async Task Handle_WithNoCategories_ReturnsEmptyList()
    {
        var repository = Substitute.For<ICategoryRepository>();
        repository.ListAsync(Arg.Any<CancellationToken>()).Returns(Array.Empty<Category>());
        var handler = new ListCategoriesQueryHandler(repository);

        var result = await handler.Handle(new ListCategoriesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }
}
