using System.Text.Json;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandFullNameBindingTests
{
    private static CreateClientCommand Bind(string fullNameJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>($$"""{ "fullName": {{fullNameJson}} }""", WireJson.Options)!;

    [Theory]
    [InlineData("\"Maria Souza\"")]
    [InlineData("\"  Maria Souza  \"")]
    public void Read_WithAValidName_BindsItTrimmed(string fullNameJson)
    {
        Bind(fullNameJson).FullName.Value.Should().Be("Maria Souza");
    }

    [Theory]
    [InlineData("\"\"", "O nome completo é obrigatório.")]
    [InlineData("\"   \"", "O nome completo é obrigatório.")]
    [InlineData("\"A\"", "O nome completo deve ter pelo menos 2 caracteres.")]
    public void Read_WithAnInvalidName_ThrowsAtTheFieldWithThePortugueseMessage(string fullNameJson, string expectedMessage)
    {
        var act = () => Bind(fullNameJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.fullName");
        exception.Message.Should().Be(expectedMessage);
    }

    [Fact]
    public void Read_WithATooLongName_ThrowsTheMaximumMessage()
    {
        var act = () => Bind($"\"{new string('a', 151)}\"");

        act.Should().Throw<JsonException>().Which.Message.Should().Be("O nome completo deve ter no máximo 150 caracteres.");
    }
}
