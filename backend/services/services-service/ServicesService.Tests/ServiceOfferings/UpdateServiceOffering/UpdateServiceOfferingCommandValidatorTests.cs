using ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

namespace ServicesService.Tests.ServiceOfferings.UpdateServiceOffering;

public class UpdateServiceOfferingCommandValidatorTests
{
    private readonly UpdateServiceOfferingCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        var result = _validator.Validate(
            new UpdateServiceOfferingCommand(Guid.NewGuid(), "Haircut", "Note", 30, 45.50m));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyServiceOfferingId_Fails()
    {
        var result = _validator.Validate(
            new UpdateServiceOfferingCommand(Guid.Empty, "Haircut", null, 30, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithEmptyName_Fails()
    {
        var result = _validator.Validate(
            new UpdateServiceOfferingCommand(Guid.NewGuid(), "", null, 30, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithNegativePrice_Fails()
    {
        var result = _validator.Validate(
            new UpdateServiceOfferingCommand(Guid.NewGuid(), "Haircut", null, 30, -0.01m));

        result.IsValid.Should().BeFalse();
    }
}
