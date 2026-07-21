using ServicesService.Application.Categories.UpdateCategory;

namespace ServicesService.Tests.Categories.UpdateCategory;

public class UpdateCategoryCommandValidatorTests
{
    private readonly UpdateCategoryCommandValidator _validator = new();
    private readonly Guid _categoryId = Guid.NewGuid();

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(_categoryId, "Hair"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyCategoryId_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(Guid.Empty, "Hair"));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(_categoryId, ""));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', 61);

        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(_categoryId, name));

        result.IsValid.Should().BeFalse();
    }
}
