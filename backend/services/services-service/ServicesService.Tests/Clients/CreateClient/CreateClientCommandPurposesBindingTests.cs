using ServicesService.Application.Clients;
using ServicesService.Application.Clients.CreateClient;
using System.Text.Json;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandPurposesBindingTests
{
    private static CreateClientCommand Bind(string purposesJson) =>
        JsonSerializer.Deserialize<CreateClientCommand>(
            $$"""{ "fullName": "Maria Souza", "referenceContacts": [{ "name": "Carlos Lima", "relationship": "Tio", "purposes": {{purposesJson}} }] }""",
            WireJson.Options)!;

    [Fact]
    public void Read_WithEveryName_BindsEachPurpose()
    {
        var command = Bind("""["emergency", "operationalSupport", "dailyCommunication"]""");

        command.ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().Equal(
            ContactPurpose.Emergency,
            ContactPurpose.OperationalSupport,
            ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void Read_WithRepeatedNames_KeepsEachOne()
    {
        var command = Bind("""["emergency", "emergency"]""");

        command.ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().Equal(
            ContactPurpose.Emergency,
            ContactPurpose.Emergency);
    }

    [Fact]
    public void Read_WithAnEmptyList_BindsAnEmptyList()
    {
        Bind("[]").ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().BeEmpty();
    }

    [Fact]
    public void Read_WithNull_BindsNull()
    {
        Bind("null").ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().BeNull();
    }

    [Theory]
    [InlineData("\"billing\"")]
    [InlineData("\"\"")]
    [InlineData("1")]
    [InlineData("\"1\"")]
    [InlineData("8")]
    [InlineData("null")]
    public void Read_WithAnItemThatIsNotAPurposeName_ThrowsAtTheItem(string itemJson)
    {
        var act = () => Bind($"[{itemJson}]");

        act.Should().Throw<JsonException>().Which.Path.Should().Be("$.referenceContacts[0].purposes[0]");
    }

    [Fact]
    public void Read_WithTwoNamesInOneString_BindsAValueThatIsNotAPurpose()
    {
        var command = Bind("""["emergency, operationalSupport"]""");

        var purpose = command.ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().ContainSingle().Subject;
        Enum.IsDefined(purpose).Should().BeFalse();
    }

    [Fact]
    public void Write_WritesEachPurposeAsACamelCaseName()
    {
        var json = JsonSerializer.Serialize(
            new ReferenceContactResponse(Guid.Empty, "Carlos Lima", "Tio", null, [ContactPurpose.OperationalSupport, ContactPurpose.DailyCommunication]),
            WireJson.Options);

        json.Should().Contain("\"purposes\":[\"operationalSupport\",\"dailyCommunication\"]");
    }
}
