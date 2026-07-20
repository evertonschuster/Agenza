using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.DeleteCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.DeleteCategory;

public class DeleteCategoryCommandValidatorTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly DeleteCategoryCommandValidator _validator;
    private readonly Guid _categoryId = Guid.NewGuid();

    public DeleteCategoryCommandValidatorTests()
    {
        var category = new Category(_categoryId, "Hair");
        _categoryRepository.GetByIdAsync(_categoryId, Arg.Any<CancellationToken>()).Returns(category);
        _validator = new DeleteCategoryCommandValidator(_categoryRepository);
    }

    [Fact]
    public async Task Validate_WithExistingCategory_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteCategoryCommand(_categoryId));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithUnknownCategoryId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _validator.ValidateAsync(new DeleteCategoryCommand(unknownId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.NotFound");
    }
}
