using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class StringValueObjectJsonConverterTests
{
    private static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters(TimeProvider.System);

    private sealed record Sample(ThreeLetters? Code, IReadOnlyList<ThreeLetters>? Codes, Guid? Id, DateOnly? Day);

    private sealed record ThreeLetters : IStringValueObject<ThreeLetters>
    {
        public const string WrongLength = "Informe exatamente três caracteres.";
        public const string NotLetters = "Use apenas letras.";

        public string Value { get; }

        private ThreeLetters(string value)
        {
            Value = value;
        }

        public static ParseResult<ThreeLetters> Create(string? raw)
        {
            if (raw is not { Length: 3 })
            {
                return ParseResult<ThreeLetters>.Failure(WrongLength);
            }

            if (!raw.All(char.IsAsciiLetter))
            {
                return ParseResult<ThreeLetters>.Failure(NotLetters);
            }

            return ParseResult<ThreeLetters>.Success(new ThreeLetters(raw));
        }

        public static ThreeLetters Restore(string value) => new(value);
    }

    private sealed record RequiredSample(MustBeFilled? Field);

    private sealed record MustBeFilled : IStringValueObject<MustBeFilled>
    {
        public const string Blank = "Preencha o campo.";

        public static bool BlankIsAbsent => false;

        public string Value { get; }

        private MustBeFilled(string value)
        {
            Value = value;
        }

        public static ParseResult<MustBeFilled> Create(string? raw) =>
            string.IsNullOrWhiteSpace(raw)
                ? ParseResult<MustBeFilled>.Failure(Blank)
                : ParseResult<MustBeFilled>.Success(new MustBeFilled(raw.Trim()));

        public static MustBeFilled Restore(string value) => new(value);
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
    [InlineData("\"ab\"", ThreeLetters.WrongLength)]
    [InlineData("\"abcd\"", ThreeLetters.WrongLength)]
    [InlineData("\"ab1\"", ThreeLetters.NotLetters)]
    [InlineData("123", ThreeLetters.WrongLength)]
    [InlineData("true", ThreeLetters.WrongLength)]
    [InlineData("{}", ThreeLetters.WrongLength)]
    public void Read_WithAnInvalidValue_ThrowsAtTheFieldWithTheMessageOfTheBrokenRule(string codeJson, string expectedMessage)
    {
        var act = () => Bind($$"""{ "code": {{codeJson}} }""");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.code");
        exception.Message.Should().Be(expectedMessage);
    }

    [Theory]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    public void Read_WithBlank_WhenTheTypeSaysBlankIsAMistake_ThrowsWithTheTypeMessage(string fieldJson)
    {
        var act = () => JsonSerializer.Deserialize<RequiredSample>($$"""{ "field": {{fieldJson}} }""", Options);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.field");
        exception.Message.Should().Be(MustBeFilled.Blank);
    }

    [Fact]
    public void Read_WithAValue_WhenTheTypeSaysBlankIsAMistake_BindsIt()
    {
        var sample = JsonSerializer.Deserialize<RequiredSample>("""{ "field": " ok " }""", Options)!;

        sample.Field!.Value.Should().Be("ok");
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
