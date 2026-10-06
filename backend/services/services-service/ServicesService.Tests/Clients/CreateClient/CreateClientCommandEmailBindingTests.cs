using System.Text.Json;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandEmailBindingTests
{
    private static CreateClientCommand Bind(string emailJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "email": {{emailJson}} }""",
            WireJson.Options)!;

    [Fact]
    public void Read_WithAValidEmail_BindsItTrimmedAndLowercased()
    {
        Bind("\"  Maria.Souza@Example.COM  \"").Email!.Value.Should().Be("maria.souza@example.com");
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithNullOrBlank_BindsNull(string emailJson)
    {
        Bind(emailJson).Email.Should().BeNull();
    }

    [Theory]
    [InlineData("\"maria\"")]
    [InlineData("\"maria@example\"")]
    [InlineData("\"maria souza@example.com\"")]
    [InlineData("123")]
    public void Read_WithAnInvalidEmail_ThrowsAtTheFieldWithTheFormatMessage(string emailJson)
    {
        var act = () => Bind(emailJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.email");
        exception.Message.Should().Be("Informe um e-mail válido.");
    }

    [Fact]
    public void Read_WithAnEmailOverTheMaximumLength_ThrowsTheLengthMessage()
    {
        var act = () => Bind($"\"{new string('a', 250)}@example.com\"");

        act.Should().Throw<JsonException>().Which.Message.Should().Be("O e-mail deve ter no máximo 254 caracteres.");
    }
}
