using ServicesService.Application.Clients.GetClientById;

namespace ServicesService.Tests.Clients.GetClientById;

public class GetClientByIdQueryValidatorTests
{
    private readonly GetClientByIdQueryValidator _validator = new();

    [Fact]
    public async Task Validate_WithAnId_Passes()
    {
        var result = await _validator.ValidateAsync(new GetClientByIdQuery(Guid.NewGuid()), TestContext.Current.CancellationToken);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithAnEmptyId_RejectsItWithTheClientIdCode()
    {
        var result = await _validator.ValidateAsync(new GetClientByIdQuery(Guid.Empty), TestContext.Current.CancellationToken);

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be(nameof(GetClientByIdQuery.ClientId));
        error.ErrorCode.Should().Be("Client.IdRequired");
        error.ErrorMessage.Should().Be("O id da pessoa é obrigatório.");
    }
}
