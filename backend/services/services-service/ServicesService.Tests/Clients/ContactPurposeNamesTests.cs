using ServicesService.Application.Clients;

namespace ServicesService.Tests.Clients;

public class ContactPurposeNamesTests
{
    [Fact]
    public void ToPurposes_CombinesEveryName()
    {
        ContactPurposeNames.ToPurposes(["emergency", "dailyCommunication"])
            .Should().Be(ContactPurpose.Emergency | ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void ToPurposes_IsCaseInsensitiveAndIgnoresRepeatedNames()
    {
        ContactPurposeNames.ToPurposes([" EMERGENCY ", "emergency", "OperationalSupport"])
            .Should().Be(ContactPurpose.Emergency | ContactPurpose.OperationalSupport);
    }

    [Fact]
    public void ToPurposes_WithoutNames_IsNone()
    {
        ContactPurposeNames.ToPurposes(null).Should().Be(ContactPurpose.None);
        ContactPurposeNames.ToPurposes([]).Should().Be(ContactPurpose.None);
    }

    [Theory]
    [InlineData(new[] { "emergency", "  dailyCommunication " }, true)]
    [InlineData(new[] { "emergency", "billing" }, false)]
    [InlineData(new[] { "" }, false)]
    public void AreKnown_MatchesTheCatalog(string[] names, bool expected)
    {
        ContactPurposeNames.AreKnown(names).Should().Be(expected);
    }

    [Fact]
    public void ToNames_ListsPurposesInCatalogOrder()
    {
        ContactPurposeNames.ToNames(ContactPurpose.DailyCommunication | ContactPurpose.Emergency)
            .Should().Equal("emergency", "dailyCommunication");
    }

    [Fact]
    public void UnknownMessage_ListsTheAllowedNamesInCatalogOrder()
    {
        ContactPurposeNames.UnknownMessage.Should().Contain("emergency, operationalSupport, dailyCommunication");
    }
}
