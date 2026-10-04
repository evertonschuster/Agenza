using ServicesService.Application.Services.DeleteService;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandValidatorTests
{
    private readonly DeleteServiceCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithServiceId_Passes()
    {
        var result = await _validator.ValidateAsync(
            new DeleteServiceCommand(Guid.NewGuid()),
            TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_ReportsTheBusinessCode()
    {
        var result = await _validator.ValidateAsync(
            new DeleteServiceCommand(Guid.Empty),
            TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be("ServiceId");
        error.ErrorCode.Should().Be("Service.IdRequired");
        error.ErrorMessage.Should().Be("O id do serviço é obrigatório.");
    }
}
