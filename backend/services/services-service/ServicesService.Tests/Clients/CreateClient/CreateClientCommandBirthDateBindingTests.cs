using ServicesService.Application.Clients.CreateClient;
using System.Text.Json;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandBirthDateBindingTests
{
    private static CreateClientCommand Bind(string birthDateJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "birthDate": {{birthDateJson}} }""",
            WireJson.Options)!;

    [Fact]
    public void Read_WithAValidDate_BindsIt()
    {
        Bind("\"2015-03-10\"").BirthDate!.Value.Should().Be(new DateOnly(2015, 3, 10));
    }

    [Fact]
    public void Read_WithNull_BindsNull()
    {
        Bind("null").BirthDate.Should().BeNull();
    }

    [Theory]
    [InlineData("\"2026-10-02\"")]
    [InlineData("\"2027-01-01\"")]
    public void Read_WithTodayOrTheFuture_ThrowsAtTheFieldWithThePastMessage(string birthDateJson)
    {
        var act = () => Bind(birthDateJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.birthDate");
        exception.Message.Should().Be("A data de nascimento deve estar no passado.");
    }

    [Fact]
    public void Read_WithMoreThanOneHundredTwentyYears_ThrowsTheAgeMessage()
    {
        var act = () => Bind("\"1905-10-02\"");

        act.Should().Throw<JsonException>().Which.Message
            .Should().Be("A data de nascimento não pode indicar idade superior a 120 anos.");
    }

    [Fact]
    public void Read_WithExactlyOneHundredTwentyYears_BindsIt()
    {
        Bind("\"1906-10-02\"").BirthDate!.Value.Should().Be(new DateOnly(1906, 10, 2));
    }

    [Fact]
    public void Read_WithAMalformedDate_KeepsTheFrameworkMessage()
    {
        var act = () => Bind("\"abc\"");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.birthDate");
        exception.Message.Should().StartWith("The JSON value could not be converted");
    }
}
