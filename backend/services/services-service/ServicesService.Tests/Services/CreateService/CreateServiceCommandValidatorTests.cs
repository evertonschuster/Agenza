using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandValidatorTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly CreateServiceCommandValidator _validator;

    public CreateServiceCommandValidatorTests()
    {
        _serviceRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _categoryRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => new Category(callInfo.ArgAt<Guid>(0), "Hair"));
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.ArgAt<IReadOnlyCollection<Guid>>(0)
                .Select(id => new Tag(id, "VIP", TagColor.From("#0d9488"), null))
                .ToList());
        _validator = new CreateServiceCommandValidator(_serviceRepository, _categoryRepository, _tagRepository);
    }

    private static CreateServiceCommand ValidCommand() =>
        new("Haircut", "Note", 30, 15, 60, 45.50m, 10m, null, null);

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand())).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Name = "" })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', Service.NameMaxLength + 1);

        (await _validator.ValidateAsync(ValidCommand() with { Name = name })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDescriptionOverMaxLength_Fails()
    {
        var description = new string('x', Service.DescriptionMaxLength + 1);

        (await _validator.ValidateAsync(ValidCommand() with { Description = description })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNonPositiveMinDuration_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MinDurationMinutes = 0 })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDurationOverAllowedLimit_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDurationMinutes = Service.MaxAllowedDurationMinutes + 1 }))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMinDurationGreaterThanMaxDuration_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MinDurationMinutes = 61, MaxDurationMinutes = 60 }))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDurationOutsideMinMaxRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { DurationMinutes = 5 })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNegativePrice_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = -0.01m })).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.01)]
    public async Task Validate_WithMaxDiscountPercentageOutsideRange_Fails(double maxDiscountPercentage)
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = (decimal)maxDiscountPercentage }))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDuplicateName_FailsWithDuplicateNameErrorCode()
    {
        _serviceRepository.NameExistsAsync("Haircut", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(ValidCommand());

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Service.DuplicateName");
    }

    [Fact]
    public async Task Validate_WithUnknownCategoryId_FailsWithNotFoundErrorCode()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _validator.ValidateAsync(ValidCommand() with { CategoryId = categoryId });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.NotFound");
    }

    [Fact]
    public async Task Validate_WithoutCategoryId_DoesNotCheckCategoryExistence()
    {
        var result = await _validator.ValidateAsync(ValidCommand() with { CategoryId = null });

        result.IsValid.Should().BeTrue();
        await _categoryRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Validate_WithUnknownTagId_FailsWithNotFoundErrorCode()
    {
        var tagId = Guid.NewGuid();
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _validator.ValidateAsync(ValidCommand() with { TagIds = [tagId] });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.NotFound");
    }

    [Fact]
    public async Task Validate_WithEmptyTagIds_DoesNotCheckTagExistence()
    {
        var result = await _validator.ValidateAsync(ValidCommand() with { TagIds = [] });

        result.IsValid.Should().BeTrue();
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }
}
