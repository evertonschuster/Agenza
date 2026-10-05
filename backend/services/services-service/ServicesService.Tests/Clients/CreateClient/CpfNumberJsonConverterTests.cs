using System.Text.Json;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CpfNumberJsonConverterTests
{
    private static CreateClientCommand Bind(string cpfJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "cpf": {{cpfJson}} }""",
            WireJson.Options)!;

    [Theory]
    [InlineData("\"529.982.247-25\"")]
    [InlineData("\"52998224725\"")]
    [InlineData("\"  529.982.247-25  \"")]
    [InlineData("\"529 982 247 25\"")]
    public void Read_WithAnyFormattingOfAValidCpf_BindsTheDigits(string cpfJson)
    {
        var command = Bind(cpfJson);

        command.Cpf!.Value.Should().Be(ClientTestData.ValidCpfDigits);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithNullOrBlank_BindsNull(string cpfJson)
    {
        Bind(cpfJson).Cpf.Should().BeNull();
    }

    [Fact]
    public void Read_WithTheFieldAbsent_BindsNull()
    {
        var command = JsonSerializer.Deserialize<CreateClientCommand>("""{ "fullName": "Maria Souza" }""", WireJson.Options)!;

        command.Cpf.Should().BeNull();
    }

    [Theory]
    [InlineData("\"529.982.247-24\"")]
    [InlineData("\"111.111.111-11\"")]
    [InlineData("\"5299822472\"")]
    [InlineData("\"529.982.247-2a\"")]
    [InlineData("52998224725")]
    [InlineData("true")]
    [InlineData("{}")]
    public void Read_WithAnInvalidCpf_ThrowsAJsonExceptionAtTheField(string cpfJson)
    {
        var act = () => Bind(cpfJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.cpf");
        exception.Message.Should().Contain("O CPF informado é inválido.");
    }

    [Fact]
    public void Read_WithAnInvalidCpf_NeverEchoesTheValue()
    {
        var act = () => Bind("\"529.982.247-24\"");

        act.Should().Throw<JsonException>().Which.Message.Should().NotContain("247");
    }

    [Fact]
    public void Read_BindsTheCpfOfAGuardian()
    {
        var command = JsonSerializer.Deserialize<CreateClientCommand>(
            """{ "fullName": "Maria Souza", "guardians": [{ "name": "Ana Souza", "relationship": "Mãe", "cpf": "123.456.789-09" }] }""",
            WireJson.Options)!;

        command.Guardians.Should().ContainSingle().Which.Cpf!.Value.Should().Be("12345678909");
    }

    [Fact]
    public void Read_WithAnInvalidGuardianCpf_ThrowsAtTheIndexedField()
    {
        var act = () => JsonSerializer.Deserialize<CreateClientCommand>(
            """{ "fullName": "Maria Souza", "guardians": [{ "name": "Ana Souza", "relationship": "Mãe", "cpf": "123" }] }""",
            WireJson.Options);

        act.Should().Throw<JsonException>().Which.Path.Should().Be("$.guardians[0].cpf");
    }

    [Fact]
    public void Write_EmitsTheDigits()
    {
        var json = JsonSerializer.Serialize(
            new GuardianInput("Ana Souza", "Mãe", null, ClientTestData.Cpf()),
            WireJson.Options);

        json.Should().Contain("\"cpf\":\"52998224725\"");
    }
}
