using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.CreateCategory;

namespace ServicesService.Tests.Categories.CreateCategory;

public class CreateCategoryCommandValidatorTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly CreateCategoryCommandValidator _validator;

    public CreateCategoryCommandValidatorTests()
    {
        _categoryRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new CreateCategoryCommandValidator(_categoryRepository);
    }

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
        var name = new string('x', 101);

        var result = await _validator.ValidateAsync(new CreateCategoryCommand(name));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDuplicateName_FailsWithDuplicateNameErrorCode()
    {
        _categoryRepository.NameExistsAsync("Hair", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new CreateCategoryCommand("Hair"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.DuplicateName");
    }
}
