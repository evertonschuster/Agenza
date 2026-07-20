using ServicesService.Application.Abstractions;
using ServicesService.Application.Categories.UpdateCategory;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Categories.UpdateCategory;

public class UpdateCategoryCommandValidatorTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly UpdateCategoryCommandValidator _validator;
    private readonly Guid _categoryId = Guid.NewGuid();

    public UpdateCategoryCommandValidatorTests()
    {
        var category = new Category(_categoryId, "Hair");
        _categoryRepository.GetByIdAsync(_categoryId, Arg.Any<CancellationToken>()).Returns(category);
        _categoryRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new UpdateCategoryCommandValidator(_categoryRepository);
    }

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
    public async Task Validate_WithUnknownCategoryId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(unknownId, "Hair"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.NotFound");
    }

    [Fact]
    public async Task Validate_RenamingToItsOwnCurrentName_Passes()
    {
        _categoryRepository.NameExistsAsync("Hair", _categoryId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(_categoryId, "Hair"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_RenamingToAnotherCategorysName_FailsWithDuplicateNameErrorCode()
    {
        _categoryRepository.NameExistsAsync("Nails", _categoryId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new UpdateCategoryCommand(_categoryId, "Nails"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.DuplicateName");
    }
}
