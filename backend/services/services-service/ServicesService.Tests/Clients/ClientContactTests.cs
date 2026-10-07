namespace ServicesService.Tests.Clients;

public class ClientContactTests
{
    private static DomainResult<Client> CreateClient(
        GuardianData[]? guardians = null,
        ReferenceContactData[]? referenceContacts = null)
    {
        return Client.Create(
            Guid.NewGuid(),
            ClientTestData.Name(),
            null,
            null,
            null,
            null,
            null,
            ClientTestData.Today,
            guardians ?? [],
            referenceContacts ?? []);
    }

    [Fact]
    public void Guardian_WithRequiredFieldsOnly_IsTrimmedAndKeepsNullOptionals()
    {
        var client = CreateClient(guardians: [new GuardianData("  Ana Souza ", " Mãe  ", null, null)]).Value;

        var guardian = client.Guardians.Should().ContainSingle().Subject;
        guardian.TenantId.Should().Be(Guid.Empty);
        guardian.Name.Should().Be("Ana Souza");
        guardian.Relationship.Should().Be("Mãe");
        guardian.Phone.Should().BeNull();
        guardian.Cpf.Should().BeNull();
    }

    [Fact]
    public void Guardian_KeepsThePhoneAndCpf()
    {
        var client = CreateClient(
            guardians: [new GuardianData("Ana Souza", "Mãe", ClientTestData.Phone(), ClientTestData.Cpf())]).Value;

        var guardian = client.Guardians.Should().ContainSingle().Subject;
        guardian.Phone.Should().Be(ClientTestData.Phone());
        guardian.Cpf.Should().Be(ClientTestData.Cpf());
    }

    [Theory]
    [InlineData("", "Mãe", "ClientContact.NameRequired")]
    [InlineData("   ", "Mãe", "ClientContact.NameRequired")]
    [InlineData("A", "Mãe", "ClientContact.InvalidNameLength")]
    [InlineData("Ana Souza", "", "ClientContact.RelationshipRequired")]
    [InlineData("Ana Souza", "   ", "ClientContact.RelationshipRequired")]
    public void Guardian_WithoutNameOrRelationship_FailsTheClient(string name, string relationship, string expectedCode)
    {
        var result = CreateClient(guardians: [new GuardianData(name, relationship, null, null)]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(expectedCode);
    }

    [Fact]
    public void Guardian_EnforcesTheLengthLimits()
    {
        CreateClient(guardians: [new GuardianData(new string('a', ClientContact.NameMaxLength), "Mãe", null, null)])
            .IsSuccess.Should().BeTrue();
        CreateClient(guardians: [new GuardianData(new string('a', ClientContact.NameMaxLength + 1), "Mãe", null, null)])
            .IsFailure.Should().BeTrue();
        CreateClient(guardians: [new GuardianData("Ana", new string('a', ClientContact.RelationshipMaxLength), null, null)])
            .IsSuccess.Should().BeTrue();
        CreateClient(guardians: [new GuardianData("Ana", new string('a', ClientContact.RelationshipMaxLength + 1), null, null)])
            .IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ReferenceContact_KeepsItsPurposes()
    {
        var purposes = ClientTestData.Purposes(ContactPurpose.Emergency, ContactPurpose.DailyCommunication);

        var client = CreateClient(referenceContacts:
        [
            new ReferenceContactData(ClientTestData.Name(" Carlos Lima "), " Tio ", ClientTestData.Phone("11 4000-1000"), purposes),
        ]).Value;

        var contact = client.ReferenceContacts.Should().ContainSingle().Subject;
        contact.Name.Should().Be("Carlos Lima");
        contact.Relationship.Should().Be("Tio");
        contact.Phone!.Value.Should().Be("11 4000-1000");
        contact.Purposes.Should().BeEquivalentTo([ContactPurpose.Emergency, ContactPurpose.DailyCommunication]);
    }

    [Fact]
    public void ReferenceContact_KeepsItsOwnCopyOfThePurposes()
    {
        var purposes = new HashSet<ContactPurpose> { ContactPurpose.Emergency };
        var client = CreateClient(referenceContacts:
            [new ReferenceContactData(ClientTestData.Name("Carlos Lima"), "Tio", null, purposes)]).Value;

        purposes.Add(ContactPurpose.OperationalSupport);

        client.ReferenceContacts.Single().Purposes.Should().BeEquivalentTo([ContactPurpose.Emergency]);
    }

    [Fact]
    public void ReferenceContact_WithAnUndefinedPurpose_FailsTheClient()
    {
        var result = CreateClient(referenceContacts:
            [new ReferenceContactData(ClientTestData.Name("Carlos Lima"), "Tio", null, ClientTestData.Purposes((ContactPurpose)3))]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientReferenceContact.PurposeUnknown");
    }

    [Fact]
    public void ReferenceContact_WithoutPurposes_FailsTheClient()
    {
        var result = CreateClient(referenceContacts:
            [new ReferenceContactData(ClientTestData.Name("Carlos Lima"), "Tio", null, ClientTestData.Purposes())]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientReferenceContact.PurposesRequired");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ReferenceContact_WithoutRelationship_FailsTheClient(string relationship)
    {
        var result = CreateClient(referenceContacts:
            [new ReferenceContactData(ClientTestData.Name("Carlos Lima"), relationship, null, ClientTestData.Purposes(ContactPurpose.Emergency))]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientContact.RelationshipRequired");
    }
}
