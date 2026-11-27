using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class ObjectValueObjectJsonConverterTests
{
    private static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters(TimeProvider.System);

    private sealed record Sample(Window? Window, IReadOnlyList<Window>? Windows, Label? Label);

    private sealed record Window : IObjectValueObject<Window>
    {
        public const string BothRequired = "Informe o início e o fim.";
        public const string Backwards = "O início não pode passar do fim.";

        public int From { get; }
        public int To { get; }

        private Window(int from, int to)
        {
            From = from;
            To = to;
        }

        public static ParseResult<Window> Create(int? from, int? to)
        {
            if (from is not { } start || to is not { } end)
            {
                return ParseResult<Window>.Failure(BothRequired);
            }

            return start > end
                ? ParseResult<Window>.Failure(Backwards)
                : ParseResult<Window>.Success(new Window(start, end));
        }
    }

    private sealed record Label : IObjectValueObject<Label>
    {
        public string Text { get; }
        public FullName? Author { get; }

        private Label(string text, FullName? author)
        {
            Text = text;
            Author = author;
        }

        public static ParseResult<Label> Create(string? text, FullName? author = null) =>
            string.IsNullOrWhiteSpace(text)
                ? ParseResult<Label>.Failure("Informe o texto.")
                : ParseResult<Label>.Success(new Label(text, author));
    }

    private static Sample Read(string json) => JsonSerializer.Deserialize<Sample>(json, Options)!;

    [Fact]
    public void Read_WithAValidObject_BuildsTheValueObjectThroughItsCreate()
    {
        var sample = Read("""{ "window": { "from": 1, "to": 5 } }""");

        sample.Window.Should().NotBeNull();
        sample.Window!.From.Should().Be(1);
        sample.Window.To.Should().Be(5);
    }

    [Fact]
    public void Read_MatchesThePartNamesIgnoringCase()
    {
        var sample = Read("""{ "window": { "FROM": 2, "To": 3 } }""");

        sample.Window.Should().Be(Read("""{ "window": { "from": 2, "to": 3 } }""").Window);
    }

    [Fact]
    public void Read_WithAbsentOrNullMember_LeavesItNull()
    {
        Read("{}").Window.Should().BeNull();
        Read("""{ "window": null }""").Window.Should().BeNull();
    }

    [Fact]
    public void Read_WithAnObjectTheCreateRefuses_ThrowsAtTheFieldWithItsMessage()
    {
        var act = () => Read("""{ "window": { "from": 5, "to": 1 } }""");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.window");
        exception.Message.Should().Be(Window.Backwards);
    }

    [Theory]
    [InlineData("""{ "window": { "from": 1 } }""")]
    [InlineData("""{ "window": {} }""")]
    [InlineData("""{ "window": { "from": null, "to": 2 } }""")]
    public void Read_WithAMissingPart_ThrowsTheCreateMessage(string json)
    {
        var act = () => Read(json);

        act.Should().Throw<JsonException>().Which.Message.Should().Be(Window.BothRequired);
    }

    [Theory]
    [InlineData("""{ "window": "1-5" }""")]
    [InlineData("""{ "window": [1, 5] }""")]
    [InlineData("""{ "window": { "from": "um", "to": 5 } }""")]
    public void Read_WithTheWrongShape_Throws(string json)
    {
        var act = () => Read(json);

        act.Should().Throw<JsonException>();
    }

    [Fact]
    public void Read_InsideACollection_ThrowsAtTheIndexedField()
    {
        var act = () => Read("""{ "windows": [{ "from": 1, "to": 2 }, { "from": 9, "to": 3 }] }""");

        act.Should().Throw<JsonException>().Which.Path.Should().Be("$.windows[1]");
    }

    [Fact]
    public void Read_UsesTheValueObjectConvertersForItsParts()
    {
        var label = Read("""{ "label": { "text": "Retorno", "author": "  Maria Souza  " } }""").Label!;

        label.Author!.Value.Should().Be("Maria Souza");
    }

    [Fact]
    public void Read_WithAnOptionalPartAbsent_PassesItsDefault()
    {
        var label = Read("""{ "label": { "text": "Retorno" } }""").Label!;

        label.Text.Should().Be("Retorno");
        label.Author.Should().BeNull();
    }

    [Fact]
    public void Write_EmitsOnePropertyPerCreateParameter()
    {
        var window = Window.Create(1, 5).Value;

        JsonSerializer.Serialize(new Sample(window, null, null), Options)
            .Should().Contain("\"window\":{\"from\":1,\"to\":5}");
    }

    [Fact]
    public void Write_UsesTheValueObjectConvertersForItsParts()
    {
        var label = Label.Create("Retorno", FullName.Create("Maria Souza").Value).Value;

        JsonSerializer.Serialize(new Sample(null, null, label), Options)
            .Should().Contain("\"label\":{\"text\":\"Retorno\",\"author\":\"Maria Souza\"}");
    }

    [Fact]
    public void ObjectValueObjects_RecognisesOnlyTypesThatImplementTheMarker()
    {
        ObjectValueObjects.Is(typeof(Window)).Should().BeTrue();
        ObjectValueObjects.Is(typeof(FullName)).Should().BeFalse();
        ObjectValueObjects.Is(typeof(Sample)).Should().BeFalse();
    }

    private sealed record NoCreate : IObjectValueObject<NoCreate>;

    private sealed record TwoCreates : IObjectValueObject<TwoCreates>
    {
        public static ParseResult<TwoCreates> Create(int? a) => ParseResult<TwoCreates>.Failure("x");

        public static ParseResult<TwoCreates> Create(int? a, int? b) => ParseResult<TwoCreates>.Failure("x");
    }

    private sealed record WrongReturn : IObjectValueObject<WrongReturn>
    {
        public static WrongReturn? Create(int? a) => null;
    }

    [Fact]
    public void CreateOf_WithAValueObjectThatBreaksTheConvention_Throws()
    {
        foreach (var broken in new[] { typeof(NoCreate), typeof(TwoCreates), typeof(WrongReturn) })
        {
            var act = () => ObjectValueObjects.CreateOf(broken);

            act.Should().Throw<InvalidOperationException>();
        }
    }
}
