using ServicesService.Application.Categories.DeleteCategory;

namespace ServicesService.Tests.Categories.DeleteCategory;

public class DeleteCategoryCommandValidatorTests
{
    private readonly DeleteCategoryCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithNonEmptyCategoryId_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteCategoryCommand(Guid.NewGuid()));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyCategoryId_Fails()
    {
        var result = await _validator.ValidateAsync(new DeleteCategoryCommand(Guid.Empty));

        result.IsValid.Should().BeFalse();
    }
}
