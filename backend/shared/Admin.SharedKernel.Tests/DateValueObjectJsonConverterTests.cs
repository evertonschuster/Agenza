using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class DateValueObjectJsonConverterTests
{
    private static readonly DateTimeOffset NoonOnTheSecond = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    private sealed record Sample(BirthDate? Born);

    private static JsonSerializerOptions OptionsAt(DateTimeOffset utcNow) =>
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters(new FixedClock(utcNow));

    private static Sample Bind(string bornJson, DateTimeOffset? utcNow = null) =>
        JsonSerializer.Deserialize<Sample>($$"""{ "born": {{bornJson}} }""", OptionsAt(utcNow ?? NoonOnTheSecond))!;

    [Fact]
    public void Read_WithAValidDate_BindsIt()
    {
        Bind("\"2015-03-10\"").Born!.Value.Should().Be(new DateOnly(2015, 3, 10));
    }

    [Fact]
    public void Read_WithNull_BindsNull()
    {
        Bind("null").Born.Should().BeNull();
    }

    [Theory]
    [InlineData("\"2026-10-02\"")]
    [InlineData("\"2027-01-01\"")]
    public void Read_WithTodayOrTheFuture_ThrowsAtTheFieldWithThePastMessage(string bornJson)
    {
        var act = () => Bind(bornJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.born");
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
    public void Read_JudgesTheDateAgainstTheClockItWasGiven()
    {
        var act = () => Bind("\"2026-10-02\"", new DateTimeOffset(2026, 10, 2, 8, 0, 0, TimeSpan.Zero));

        act.Should().Throw<JsonException>();
        Bind("\"2026-10-02\"", new DateTimeOffset(2026, 10, 3, 8, 0, 0, TimeSpan.Zero))
            .Born!.Value.Should().Be(new DateOnly(2026, 10, 2));
    }

    [Theory]
    [InlineData("\"abc\"")]
    [InlineData("\"10/03/2015\"")]
    [InlineData("\"\"")]
    [InlineData("20150310")]
    public void Read_WithAMalformedDate_ThrowsTheFrameworkMessageAtTheField(string bornJson)
    {
        var act = () => Bind(bornJson);

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.born");
        exception.Message.Should().StartWith("The JSON value could not be converted");
    }

    [Fact]
    public void Write_EmitsTheIsoDate()
    {
        var json = JsonSerializer.Serialize(new Sample(BirthDate.Restore(new DateOnly(2015, 3, 10))), OptionsAt(NoonOnTheSecond));

        json.Should().Contain("\"born\":\"2015-03-10\"");
    }

    [Theory]
    [InlineData(typeof(BirthDate), true)]
    [InlineData(typeof(CpfNumber), false)]
    [InlineData(typeof(DateOnly), false)]
    [InlineData(typeof(IDateValueObject<BirthDate>), false)]
    public void Is_RecognisesOnlyTheDateValueObjects(Type type, bool expected)
    {
        DateValueObjects.Is(type).Should().Be(expected);
    }

    [Fact]
    public void InThisProject_ListsTheSharedDateValueObjects()
    {
        DateValueObjects.InThisProject().Should().Contain(typeof(BirthDate));
    }
}
