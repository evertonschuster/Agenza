using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

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
    public void ValidateName_EnforcesTheLengthLimits()
    {
        ClientContact.ValidateName(new string('a', ClientContact.NameMaxLength)).IsSuccess.Should().BeTrue();
        ClientContact.ValidateName(new string('a', ClientContact.NameMaxLength + 1)).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ValidateRelationship_EnforcesTheLengthLimit()
    {
        ClientContact.ValidateRelationship(new string('a', ClientContact.RelationshipMaxLength)).IsSuccess.Should().BeTrue();
        ClientContact.ValidateRelationship(new string('a', ClientContact.RelationshipMaxLength + 1)).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ReferenceContact_KeepsItsPurposes()
    {
        var purposes = ContactPurposes.Create(ContactPurpose.Emergency | ContactPurpose.DailyCommunication).Value;

        var client = CreateClient(referenceContacts:
        [
            new ReferenceContactData(" Carlos Lima ", " Tio ", ClientTestData.Phone("11 4000-1000"), purposes),
        ]).Value;

        var contact = client.ReferenceContacts.Should().ContainSingle().Subject;
        contact.Name.Should().Be("Carlos Lima");
        contact.Relationship.Should().Be("Tio");
        contact.Phone!.Value.Should().Be("11 4000-1000");
        contact.Purposes.Should().Be(purposes);
    }

    [Theory]
    [InlineData("", "Tio")]
    [InlineData("Carlos Lima", "")]
    public void ReferenceContact_WithoutNameOrRelationship_FailsTheClient(string name, string relationship)
    {
        var purposes = ContactPurposes.Create(ContactPurpose.Emergency).Value;

        CreateClient(referenceContacts: [new ReferenceContactData(name, relationship, null, purposes)])
            .IsFailure.Should().BeTrue();
    }
}
