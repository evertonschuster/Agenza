using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class ObjectValueObjectJsonConverterTests
{
    private static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters(TimeProvider.System);

    private sealed record Sample(Window? Window, IReadOnlyList<Window>? Windows);

    private sealed record WindowInput(int? From, int? To);

    private sealed record Window : IObjectValueObject<Window, WindowInput>
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

        public static ParseResult<Window> Create(WindowInput input)
        {
            if (input.From is not { } from || input.To is not { } to)
            {
                return ParseResult<Window>.Failure(BothRequired);
            }

            return from > to
                ? ParseResult<Window>.Failure(Backwards)
                : ParseResult<Window>.Success(new Window(from, to));
        }

        public static WindowInput ToInput(Window value) => new(value.From, value.To);
    }

    private static Sample Read(string json) => JsonSerializer.Deserialize<Sample>(json, Options)!;

    [Fact]
    public void Read_WithAValidObject_BuildsTheValueObjectThroughItsFactory()
    {
        var sample = Read("""{ "window": { "from": 1, "to": 5 } }""");

        sample.Window.Should().NotBeNull();
        sample.Window!.From.Should().Be(1);
        sample.Window.To.Should().Be(5);
    }

    [Fact]
    public void Read_WithAbsentOrNullMember_LeavesItNull()
    {
        Read("{}").Window.Should().BeNull();
        Read("""{ "window": null }""").Window.Should().BeNull();
    }

    [Fact]
    public void Read_WithAnObjectTheFactoryRefuses_ThrowsAtTheFieldWithTheFactoryMessage()
    {
        var act = () => Read("""{ "window": { "from": 5, "to": 1 } }""");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.window");
        exception.Message.Should().Be(Window.Backwards);
    }

    [Theory]
    [InlineData("""{ "window": { "from": 1 } }""")]
    [InlineData("""{ "window": {} }""")]
    public void Read_WithAMissingPart_ThrowsTheFactoryMessage(string json)
    {
        var act = () => Read(json);

        act.Should().Throw<JsonException>().Which.Message.Should().Be(Window.BothRequired);
    }

    [Theory]
    [InlineData("""{ "window": "1-5" }""")]
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
    public void Write_EmitsTheInputShape()
    {
        var window = Window.Create(new WindowInput(1, 5)).Value;

        JsonSerializer.Serialize(new Sample(window, null), Options)
            .Should().Contain("""
                "window":{"from":1,"to":5}
                """.Trim());
    }

    [Fact]
    public void ObjectValueObjects_RecognisesOnlyTypesThatImplementTheContract()
    {
        ObjectValueObjects.Is(typeof(Window)).Should().BeTrue();
        ObjectValueObjects.Is(typeof(FullName)).Should().BeFalse();
        ObjectValueObjects.Is(typeof(WindowInput)).Should().BeFalse();
        ObjectValueObjects.InputOf(typeof(Window)).Should().Be(typeof(WindowInput));
    }
}
