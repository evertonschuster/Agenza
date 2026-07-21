using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandValidatorTests
{
    private readonly UpdateServiceCommandValidator _validator = new();
    private readonly Guid _serviceId = Guid.NewGuid();

    private UpdateServiceCommand ValidCommand() =>
        new(_serviceId, "Haircut", "Note", 30, 15, 60, 45.50m, 10m, null, null);

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand())).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { ServiceId = Guid.Empty })).IsValid.Should().BeFalse();
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
    public async Task Validate_WithPriceExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = 45.123m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDiscountPercentageOutsideRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 100.01m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDiscountPercentageExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 12.345m })).IsValid.Should().BeFalse();
    }
}
