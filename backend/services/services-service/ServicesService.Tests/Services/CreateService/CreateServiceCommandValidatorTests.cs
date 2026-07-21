using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandValidatorTests
{
    private readonly CreateServiceCommandValidator _validator = new();

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

    [Fact]
    public async Task Validate_WithPriceExceedingPrecision_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = 123456789.12m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithPriceExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = 45.123m })).IsValid.Should().BeFalse();
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
    public async Task Validate_WithMaxDiscountPercentageExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 12.345m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNoTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = null })).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [] })).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithMultipleDistinctTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [Guid.NewGuid(), Guid.NewGuid()] }))
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithDuplicateTagIds_Fails()
    {
        var duplicateId = Guid.NewGuid();

        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [duplicateId, duplicateId] }))
            .IsValid.Should().BeFalse();
    }
}
