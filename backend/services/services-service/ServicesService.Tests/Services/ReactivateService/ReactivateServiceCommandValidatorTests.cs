using ServicesService.Application.Services.ReactivateService;

namespace ServicesService.Tests.Services.ReactivateService;

public class ReactivateServiceCommandValidatorTests
{
    private readonly ReactivateServiceCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithServiceId_Passes()
    {
        var result = await _validator.ValidateAsync(
            new ReactivateServiceCommand(Guid.NewGuid()),
            TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_ReportsTheBusinessCode()
    {
        var result = await _validator.ValidateAsync(
            new ReactivateServiceCommand(Guid.Empty),
            TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be("ServiceId");
        error.ErrorCode.Should().Be("Service.IdRequired");
    }
}
