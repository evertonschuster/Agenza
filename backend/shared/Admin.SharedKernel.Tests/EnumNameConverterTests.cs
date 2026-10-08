using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class EnumNameConverterTests
{
    private static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddEnumNameConverter();

    private enum Flavor
    {
        Sweet = 1,
        SourCream = 2,
    }

    private sealed record Sample(IReadOnlyList<Flavor>? Flavors);

    [Fact]
    public void Write_NamesEachMemberInCamelCase()
    {
        JsonSerializer.Serialize(new Sample([Flavor.Sweet, Flavor.SourCream]), Options)
            .Should().Be("{\"flavors\":[\"sweet\",\"sourCream\"]}");
    }

    [Theory]
    [InlineData("\"sourCream\"")]
    [InlineData("\"SourCream\"")]
    [InlineData("\"SOURCREAM\"")]
    public void Read_AcceptsTheNameInAnyCase(string flavorJson)
    {
        JsonSerializer.Deserialize<Sample>($$"""{ "flavors": [{{flavorJson}}] }""", Options)!
            .Flavors.Should().Equal(Flavor.SourCream);
    }

    [Theory]
    [InlineData("2")]
    [InlineData("\"2\"")]
    [InlineData("\"bitter\"")]
    [InlineData("\"\"")]
    [InlineData("null")]
    public void Read_RefusesAnythingThatIsNotAMemberName(string flavorJson)
    {
        var act = () => JsonSerializer.Deserialize<Sample>($$"""{ "flavors": [{{flavorJson}}] }""", Options);

        act.Should().Throw<JsonException>().Which.Path.Should().Be("$.flavors[0]");
    }
}
