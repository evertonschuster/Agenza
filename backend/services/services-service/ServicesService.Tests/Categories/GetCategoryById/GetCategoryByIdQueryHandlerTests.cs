using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.GetCategoryById;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.GetCategoryById;

public class GetCategoryByIdQueryHandlerTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly GetCategoryByIdQueryHandler _handler;

    public GetCategoryByIdQueryHandlerTests()
    {
        _handler = new GetCategoryByIdQueryHandler(_categoryRepository);
    }

    [Fact]
    public async Task Handle_WithExistingCategory_ReturnsIt()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var result = await _handler.Handle(new GetCategoryByIdQuery(category.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(category.Id);
        result.Value.Name.Should().Be(category.Name);
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(new GetCategoryByIdQuery(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
    }
}
