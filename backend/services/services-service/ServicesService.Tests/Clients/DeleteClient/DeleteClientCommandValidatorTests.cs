using ServicesService.Application.Clients.DeleteClient;

namespace ServicesService.Tests.Clients.DeleteClient;

public class DeleteClientCommandValidatorTests
{
    private readonly DeleteClientCommandValidator _validator = new();

    [Fact]
    public async Task Validate_WithAnId_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteClientCommand(Guid.NewGuid()), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithAnEmptyId_RejectsItWithTheClientIdCode()
    {
        var result = await _validator.ValidateAsync(new DeleteClientCommand(Guid.Empty), TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be(nameof(DeleteClientCommand.ClientId));
        error.ErrorCode.Should().Be("Client.IdRequired");
        error.ErrorMessage.Should().Be("O id da pessoa é obrigatório.");
    }
}
