using ServicesService.Application.Services.UpdateService;

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
        (await _validator.ValidateAsync(ValidCommand(), TestContext.Current.CancellationToken)).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { ServiceId = Guid.Empty }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Name = "" }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', Service.NameMaxLength + 1);

        (await _validator.ValidateAsync(ValidCommand() with { Name = name }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMinDurationGreaterThanMaxDuration_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MinDurationMinutes = 61, MaxDurationMinutes = 60 }, TestContext.Current.CancellationToken))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDurationOutsideMinMaxRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { DurationMinutes = 5 }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNegativePrice_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = -0.01m }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithPriceExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = 45.123m }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDiscountPercentageOutsideRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 100.01m }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDiscountPercentageExceedingScale_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 12.345m }, TestContext.Current.CancellationToken)).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNoTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = null }, TestContext.Current.CancellationToken)).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [] }, TestContext.Current.CancellationToken)).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithMultipleDistinctTagIds_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [Guid.NewGuid(), Guid.NewGuid()] }, TestContext.Current.CancellationToken))
            .IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithDuplicateTagIds_Fails()
    {
        var duplicateId = Guid.NewGuid();

        (await _validator.ValidateAsync(ValidCommand() with { TagIds = [duplicateId, duplicateId] }, TestContext.Current.CancellationToken))
            .IsValid.Should().BeFalse();
    }
}
