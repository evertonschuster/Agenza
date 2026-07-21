using ServicesService.Application.Tags.UpdateTag;

namespace ServicesService.Tests.Tags.UpdateTag;

public class UpdateTagCommandValidatorTests
{
    private readonly UpdateTagCommandValidator _validator = new();
    private readonly Guid _tagId = Guid.NewGuid();

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "Returning", "#0d9488", null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyTagId_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(Guid.Empty, "VIP", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithColorOutsidePalette_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "VIP", "#123456", null));

        result.IsValid.Should().BeFalse();
    }
}
