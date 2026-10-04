using ServicesService.Application.Services.DeactivateService;

namespace ServicesService.Tests.Services.DeactivateService;

public class DeactivateServiceCommandValidatorTests
{
    private readonly DeactivateServiceCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithServiceId_Passes()
    {
        var result = await _validator.ValidateAsync(
            new DeactivateServiceCommand(Guid.NewGuid()),
            TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_ReportsTheBusinessCode()
    {
        var result = await _validator.ValidateAsync(
            new DeactivateServiceCommand(Guid.Empty),
            TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be("ServiceId");
        error.ErrorCode.Should().Be("Service.IdRequired");
    }
}
