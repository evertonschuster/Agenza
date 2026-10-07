using ServicesService.Application.Clients.DeactivateClient;

namespace ServicesService.Tests.Clients.DeactivateClient;

public class DeactivateClientCommandValidatorTests
{
    private readonly DeactivateClientCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithAnId_Passes()
    {
        var result = await _validator.ValidateAsync(new DeactivateClientCommand(Guid.NewGuid()), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithAnEmptyId_RejectsItWithTheClientIdCode()
    {
        var result = await _validator.ValidateAsync(new DeactivateClientCommand(Guid.Empty), TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be(nameof(DeactivateClientCommand.ClientId));
        error.ErrorCode.Should().Be("Client.IdRequired");
        error.ErrorMessage.Should().Be("O id da pessoa é obrigatório.");
    }
}
