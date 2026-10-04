using ServicesService.Application.Tags.CreateTag;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandValidatorTests
{
    private readonly CreateTagCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#0d9488", "Note"), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("", "#0d9488", null), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', 41);

        var result = await _validator.ValidateAsync(new CreateTagCommand(name, "#0d9488", null), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithColorOutsidePalette_Fails()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#123456", null), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDescriptionOverMaxLength_Fails()
    {
        var description = new string('x', 201);

        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#0d9488", description), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeFalse();
    }
}
