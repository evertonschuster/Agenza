using ServicesService.Application.Categories.CreateCategory;

namespace ServicesService.Tests.Categories.CreateCategory;

public class CreateCategoryCommandValidatorTests
{
    private readonly CreateCategoryCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new CreateCategoryCommand("Hair"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new CreateCategoryCommand(""));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', 61);

        var result = await _validator.ValidateAsync(new CreateCategoryCommand(name));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_DoesNotDependOnARepository()
    {
        // No repository is constructor-injected (docs/adr/0013): existence and
        // duplicate-name checks are the handler's job now, not the validator's.
        var result = await _validator.ValidateAsync(new CreateCategoryCommand("Hair"));

        result.IsValid.Should().BeTrue();
    }
}
