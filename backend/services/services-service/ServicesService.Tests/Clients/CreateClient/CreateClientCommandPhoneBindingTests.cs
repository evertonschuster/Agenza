using ServicesService.Application.Clients.CreateClient;
using System.Text.Json;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandPhoneBindingTests
{
    private const string InvalidMessage =
        "Informe um telefone válido, com até 20 caracteres entre dígitos, espaços, +, parênteses e hífen.";

    private static CreateClientCommand Bind(string phoneJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "phone": {{phoneJson}} }""",
            WireJson.Options)!;

    [Fact]
    public void Read_WithAValidPhone_BindsItTrimmed()
    {
        Bind("\"  (11) 99999-0000  \"").Phone!.Value.Should().Be("(11) 99999-0000");
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithNullOrBlank_BindsNull(string phoneJson)
    {
        Bind(phoneJson).Phone.Should().BeNull();
    }

    [Theory]
    [InlineData("\"telefone\"")]
    [InlineData("\"123456789012345678901\"")]
    [InlineData("\"11.99999.0000\"")]
    [InlineData("11999990000")]
    public void Read_WithAnInvalidPhone_ThrowsAtTheFieldWithThePortugueseMessage(string phoneJson)
    {
        var act = () => Bind(phoneJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.phone");
        exception.Message.Should().Be(InvalidMessage);
    }

    [Fact]
    public void Read_BindsThePhoneOfAGuardianAndOfAReferenceContact()
    {
        var command = JsonSerializer.Deserialize<CreateClientCommand>(
            """
            { "fullName": "Maria Souza",
              "guardians": [{ "name": "Ana Souza", "relationship": "Mãe", "phone": "(11) 98888-0000" }],
              "referenceContacts": [{ "name": "Carlos Lima", "relationship": "Tio", "phone": "11 4000-1000", "purposes": ["emergency"] }] }
            """,
            WireJson.Options)!;

        command.Guardians.Should().ContainSingle().Which.Phone!.Value.Should().Be("(11) 98888-0000");
        command.ReferenceContacts.Should().ContainSingle().Which.Phone!.Value.Should().Be("11 4000-1000");
    }

    [Theory]
    [InlineData("""{ "fullName": "Maria Souza", "guardians": [{ "name": "Ana", "relationship": "Mãe", "phone": "x" }] }""", "$.guardians[0].phone")]
    [InlineData("""{ "fullName": "Maria Souza", "referenceContacts": [{ "name": "Carlos", "relationship": "Tio", "phone": "x", "purposes": ["emergency"] }] }""", "$.referenceContacts[0].phone")]
    public void Read_WithAnInvalidContactPhone_ThrowsAtTheIndexedField(string json, string expectedPath)
    {
        var act = () => JsonSerializer.Deserialize<CreateClientCommand>(json, WireJson.Options);

        act.Should().Throw<JsonException>().Which.Path.Should().Be(expectedPath);
    }
}
