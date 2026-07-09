using ServicesService.Application.Tags.CreateTag;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandValidatorTests
{
    private readonly CreateTagCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        var result = _validator.Validate(new CreateTagCommand(Guid.NewGuid(), "VIP", "#0d9488", "Note"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyName_Fails()
    {
        var result = _validator.Validate(new CreateTagCommand(Guid.NewGuid(), "", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', 41);

        var result = _validator.Validate(new CreateTagCommand(Guid.NewGuid(), name, "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithColorOutsidePalette_Fails()
    {
        var result = _validator.Validate(new CreateTagCommand(Guid.NewGuid(), "VIP", "#123456", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithDescriptionOverMaxLength_Fails()
    {
        var description = new string('x', 201);

        var result = _validator.Validate(new CreateTagCommand(Guid.NewGuid(), "VIP", "#0d9488", description));

        result.IsValid.Should().BeFalse();
    }
}
