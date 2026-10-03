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
        result.Error.Code.Should().Be("ContactPurposes.Unknown");
    }

    [Fact]
    public void Parse_WithoutNames_Fails()
    {
        ContactPurposes.Parse(null).Error.Code.Should().Be("ContactPurposes.Required");
        ContactPurposes.Parse([]).Error.Code.Should().Be("ContactPurposes.Required");
    }

    [Fact]
    public void ToNames_ListsPurposesInCatalogOrder()
    {
        var purposes = ContactPurpose.DailyCommunication | ContactPurpose.Emergency;

        ContactPurposes.ToNames(purposes).Should().Equal("emergency", "dailyCommunication");
    }

    [Theory]
    [InlineData("billing")]
    [InlineData("")]
    public void Parse_WithANameOutsideTheCatalog_Fails(string name)
    {
        ContactPurposes.Parse([name]).Error.Code.Should().Be("ContactPurposes.Unknown");
    }

    [Fact]
    public void Unknown_ListsTheAllowedPurposesInCatalogOrder()
    {
        ContactPurposes.Unknown.Message.Should().Contain("emergency, operationalSupport, dailyCommunication");
    }
}
