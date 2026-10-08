using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class FieldErrorTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Serialize_WithoutMeta_KeepsTheOriginalTwoMemberShape()
    {
        var json = JsonSerializer.Serialize(new FieldError("Name.Required", "Name is required."), WebOptions);

        json.Should().Be("""{"code":"Name.Required","message":"Name is required."}""");
    }

    [Fact]
    public void Serialize_WithMeta_IncludesIt()
    {
        var meta = new Dictionary<string, string> { ["clientId"] = "0197f2a0-0000-7000-8000-000000000001" };

        var json = JsonSerializer.Serialize(new FieldError("Client.DuplicateCpf", "Already exists.", meta), WebOptions);

        json.Should().Be(
            """{"code":"Client.DuplicateCpf","message":"Already exists.","meta":{"clientId":"0197f2a0-0000-7000-8000-000000000001"}}""");
    }

    [Fact]
    public void Deserialize_RoundTripsTheMeta()
    {
        var original = new FieldError("A", "B", new Dictionary<string, string> { ["k"] = "v" });

        var copy = JsonSerializer.Deserialize<FieldError>(JsonSerializer.Serialize(original, WebOptions), WebOptions);

        copy.Code.Should().Be("A");
        copy.Meta.Should().ContainKey("k").WhoseValue.Should().Be("v");
    }
}
