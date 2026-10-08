using ServicesService.Application.Clients.CreateClient;
using System.Text.Json;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandNotesBindingTests
{
    private static CreateClientCommand Bind(string notesJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "administrativeNotes": {{notesJson}} }""",
            WireJson.Options)!;

    [Fact]
    public void Read_WithValidNotes_BindsThemTrimmed()
    {
        Bind("\"  Prefere contato pela manhã.  \"").AdministrativeNotes!.Value.Should().Be("Prefere contato pela manhã.");
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithNullOrBlank_BindsNull(string notesJson)
    {
        Bind(notesJson).AdministrativeNotes.Should().BeNull();
    }

    [Fact]
    public void Read_WithExactlyFiveHundredCharacters_BindsThem()
    {
        Bind($"\"{new string('n', 500)}\"").AdministrativeNotes!.Value.Should().HaveLength(500);
    }

    [Fact]
    public void Read_WithMoreThanFiveHundredCharacters_ThrowsAtTheFieldWithTheLengthMessage()
    {
        var act = () => Bind($"\"{new string('n', 501)}\"");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.administrativeNotes");
        exception.Message.Should().Be("As observações administrativas devem ter no máximo 500 caracteres.");
    }

    [Fact]
    public void Read_WithANumber_ThrowsTheTextMessage()
    {
        var act = () => Bind("123");

        act.Should().Throw<JsonException>().Which.Message
            .Should().Be("As observações administrativas devem ser um texto de até 500 caracteres.");
    }
}
