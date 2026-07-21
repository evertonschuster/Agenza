using ServicesService.Application.Tags.DeleteTag;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandValidatorTests
{
    private readonly DeleteTagCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithNonEmptyTagId_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteTagCommand(Guid.NewGuid()));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyTagId_Fails()
    {
        var result = await _validator.ValidateAsync(new DeleteTagCommand(Guid.Empty));

        result.IsValid.Should().BeFalse();
    }
}
