using ServicesService.Application.Services.DeleteService;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandValidatorTests
{
    private readonly DeleteServiceCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithNonEmptyServiceId_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteServiceCommand(Guid.NewGuid()));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_Fails()
    {
        var result = await _validator.ValidateAsync(new DeleteServiceCommand(Guid.Empty));

        result.IsValid.Should().BeFalse();
    }
}
