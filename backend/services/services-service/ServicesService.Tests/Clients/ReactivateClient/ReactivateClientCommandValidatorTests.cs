using ServicesService.Application.Clients.ReactivateClient;

namespace ServicesService.Tests.Clients.ReactivateClient;

public class ReactivateClientCommandValidatorTests
{
    private readonly ReactivateClientCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithAnId_Passes()
    {
        var result = await _validator.ValidateAsync(new ReactivateClientCommand(Guid.NewGuid()), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithAnEmptyId_RejectsItWithTheClientIdCode()
    {
        var result = await _validator.ValidateAsync(new ReactivateClientCommand(Guid.Empty), TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be(nameof(ReactivateClientCommand.ClientId));
        error.ErrorCode.Should().Be("Client.IdRequired");
        error.ErrorMessage.Should().Be("O id da pessoa é obrigatório.");
    }
}
