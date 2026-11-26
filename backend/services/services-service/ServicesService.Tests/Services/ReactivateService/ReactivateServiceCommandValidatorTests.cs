using ServicesService.Application.Services.ReactivateService;

namespace ServicesService.Tests.Services.ReactivateService;

public class ReactivateServiceCommandValidatorTests
{
    private readonly ReactivateServiceCommandValidator _validator = new();

    [Fact]
    public async Task Validate_ComId_Passa()
    {
        var result = await _validator.ValidateAsync(new ReactivateServiceCommand(Guid.NewGuid()), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_ComIdVazio_RecusaNoCampoServiceId()
    {
        var result = await _validator.ValidateAsync(new ReactivateServiceCommand(Guid.Empty), TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be(nameof(ReactivateServiceCommand.ServiceId));
        error.ErrorMessage.Should().Be("O id do serviço é obrigatório.");
    }
}
