using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class ContactPurposesTests
{
    [Fact]
    public void Parse_CombinesEveryPurpose()
    {
        var result = ContactPurposes.Parse(["emergency", "dailyCommunication"]);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(ContactPurpose.Emergency | ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void Parse_IsCaseInsensitiveAndIgnoresRepeatedNames()
    {
        var result = ContactPurposes.Parse([" EMERGENCY ", "emergency", "OperationalSupport"]);

        result.Value.Should().Be(ContactPurpose.Emergency | ContactPurpose.OperationalSupport);
    }

    [Fact]
    public void Parse_WithAnUnknownName_Fails()
    {
        var result = ContactPurposes.Parse(["emergency", "billing"]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.Invalid");
    }

    [Fact]
    public void Parse_WithoutNames_Fails()
    {
        ContactPurposes.Parse(null).IsFailure.Should().BeTrue();
        ContactPurposes.Parse([]).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ToNames_ListsPurposesInCatalogOrder()
    {
        var purposes = ContactPurpose.DailyCommunication | ContactPurpose.Emergency;

        ContactPurposes.ToNames(purposes).Should().Equal("emergency", "dailyCommunication");
    }

    [Fact]
    public void Names_ExposesTheThreeAllowedPurposes()
    {
        ContactPurposes.Names.Should().Equal("emergency", "operationalSupport", "dailyCommunication");
    }

    [Theory]
    [InlineData("emergency", true)]
    [InlineData("  dailyCommunication ", true)]
    [InlineData("billing", false)]
    [InlineData("", false)]
    public void IsKnown_MatchesTheCatalog(string name, bool expected)
    {
        ContactPurposes.IsKnown(name).Should().Be(expected);
    }
}
