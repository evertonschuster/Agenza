using ServicesService.Application.ServiceOfferings.CreateServiceOffering;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.ServiceOfferings.CreateServiceOffering;

public class CreateServiceOfferingCommandValidatorTests
{
    private readonly CreateServiceOfferingCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        var result = _validator.Validate(new CreateServiceOfferingCommand("Haircut", "Note", 30, 45.50m));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyName_Fails()
    {
        var result = _validator.Validate(new CreateServiceOfferingCommand("", null, 30, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', ServiceOffering.NameMaxLength + 1);

        var result = _validator.Validate(new CreateServiceOfferingCommand(name, null, 30, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithDescriptionOverMaxLength_Fails()
    {
        var description = new string('x', ServiceOffering.DescriptionMaxLength + 1);

        var result = _validator.Validate(new CreateServiceOfferingCommand("Haircut", description, 30, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WithNonPositiveDuration_Fails(int durationMinutes)
    {
        var result = _validator.Validate(
            new CreateServiceOfferingCommand("Haircut", null, durationMinutes, 45.50m));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithNegativePrice_Fails()
    {
        var result = _validator.Validate(new CreateServiceOfferingCommand("Haircut", null, 30, -0.01m));

        result.IsValid.Should().BeFalse();
    }
}
