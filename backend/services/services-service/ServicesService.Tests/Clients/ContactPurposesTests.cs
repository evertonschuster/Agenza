namespace ServicesService.Tests.Clients;

public class ContactPurposesTests
{
    [Fact]
    public void Create_KeepsEveryPurposeGiven()
    {
        var result = ContactPurposes.Create(ContactPurpose.Emergency | ContactPurpose.DailyCommunication);

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be(ContactPurpose.Emergency | ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void Create_WithoutAnyPurpose_Fails()
    {
        var result = ContactPurposes.Create(ContactPurpose.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ContactPurposes.Required");
    }

    [Fact]
    public void Restore_AcceptsAValueThatCreateWouldReject()
    {
        ContactPurposes.Restore(ContactPurpose.None).Value.Should().Be(ContactPurpose.None);
    }
}
