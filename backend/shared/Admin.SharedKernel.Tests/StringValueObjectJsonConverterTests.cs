using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class StringValueObjectJsonConverterTests
{
    private static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters();

    private sealed record Sample(ThreeLetters? Code, IReadOnlyList<ThreeLetters>? Codes, Guid? Id, DateOnly? Day);

    private sealed record ThreeLetters : IStringValueObject<ThreeLetters>
    {
        public static string InvalidMessage => "Informe três letras.";

        public string Value { get; }

        private ThreeLetters(string value)
        {
            Value = value;
        }

        public static ThreeLetters Parse(string s, IFormatProvider? provider) =>
            TryParse(s, provider, out var result) ? result : throw new FormatException(InvalidMessage);

        public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, [MaybeNullWhen(false)] out ThreeLetters result)
        {
            result = s is { Length: 3 } && s.All(char.IsAsciiLetter) ? new ThreeLetters(s) : null;
            return result is not null;
        }

        public static ThreeLetters Restore(string value) => new(value);
    }

    private static Sample Bind(string json) => JsonSerializer.Deserialize<Sample>(json, Options)!;

    [Fact]
    public void Read_WithAValidValue_BindsIt()
    {
        Bind("""{ "code": "abc" }""").Code!.Value.Should().Be("abc");
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithNullOrBlank_BindsNull(string codeJson)
    {
        Bind($$"""{ "code": {{codeJson}} }""").Code.Should().BeNull();
    }

    [Theory]
    [InlineData("\"ab\"")]
    [InlineData("\"abcd\"")]
    [InlineData("\"ab1\"")]
    [InlineData("123")]
    [InlineData("true")]
    [InlineData("{}")]
    public void Read_WithAnInvalidValue_ThrowsAtTheFieldWithTheTypeMessage(string codeJson)
    {
        var act = () => Bind($$"""{ "code": {{codeJson}} }""");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.code");
        exception.Message.Should().Be(ThreeLetters.InvalidMessage);
    }

    [Fact]
    public void Read_InsideACollection_ReportsTheIndexedPath()
    {
        var act = () => Bind("""{ "codes": ["abc", "x"] }""");

        act.Should().Throw<JsonException>().Which.Path.Should().Be("$.codes[1]");
    }

    [Fact]
    public void Write_EmitsTheValue()
    {
        var json = JsonSerializer.Serialize(new Sample(ThreeLetters.Restore("abc"), null, null, null), Options);

        json.Should().Contain("\"code\":\"abc\"");
    }

    [Fact]
    public void ItLeavesTheFrameworkScalarsAlone()
    {
        var id = Guid.NewGuid();
        var json = JsonSerializer.Serialize(new Sample(null, null, id, new DateOnly(2026, 10, 6)), Options);

        var sample = JsonSerializer.Deserialize<Sample>(json, Options)!;

        json.Should().Contain($"\"id\":\"{id}\"").And.Contain("\"day\":\"2026-10-06\"");
        sample.Id.Should().Be(id);
        sample.Day.Should().Be(new DateOnly(2026, 10, 6));
    }

    [Theory]
    [InlineData(typeof(CpfNumber), true)]
    [InlineData(typeof(ThreeLetters), true)]
    [InlineData(typeof(Guid), false)]
    [InlineData(typeof(DateOnly), false)]
    [InlineData(typeof(string), false)]
    [InlineData(typeof(IStringValueObject<CpfNumber>), false)]
    public void Is_RecognisesOnlyTheTypesThatImplementTheContractOnThemselves(Type type, bool expected)
    {
        StringValueObjects.Is(type).Should().Be(expected);
    }

    [Fact]
    public void InThisProject_ListsTheSharedValueObjects()
    {
        StringValueObjects.InThisProject().Should().Contain(typeof(CpfNumber));
    }
}
