using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class ClientContactTests
{
    [Fact]
    public void Guardian_Create_WithRequiredFieldsOnly_StoresNullOptionals()
    {
        var id = Guid.NewGuid();

        var result = ClientGuardian.Create(id, "  Ana Souza ", " Mãe  ", null, null);

        result.IsSuccess.Should().BeTrue();
        var guardian = result.Value;
        guardian.Id.Should().Be(id);
        guardian.TenantId.Should().Be(Guid.Empty);
        guardian.Name.Should().Be("Ana Souza");
        guardian.Relationship.Should().Be("Mãe");
        guardian.Phone.Should().BeNull();
        guardian.Cpf.Should().BeNull();
    }

    [Fact]
    public void Guardian_Create_KeepsThePhoneAndCpf()
    {
        var guardian = ClientGuardian.Create(
            Guid.NewGuid(), "Ana Souza", "Mãe", ClientTestData.Phone(), ClientTestData.Cpf()).Value;

        guardian.Phone.Should().Be(ClientTestData.Phone());
        guardian.Cpf.Should().Be(ClientTestData.Cpf());
    }

    [Theory]
    [InlineData("", "Mãe", "ClientContact.NameRequired")]
    [InlineData("   ", "Mãe", "ClientContact.NameRequired")]
    [InlineData("A", "Mãe", "ClientContact.InvalidNameLength")]
    [InlineData("Ana Souza", "", "ClientContact.RelationshipRequired")]
    [InlineData("Ana Souza", "   ", "ClientContact.RelationshipRequired")]
    public void Guardian_Create_WithoutNameOrRelationship_Fails(string name, string relationship, string expectedCode)
    {
        var result = ClientGuardian.Create(Guid.NewGuid(), name, relationship, null, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(expectedCode);
    }

    [Fact]
    public void Guardian_Create_EnforcesTheLengthLimits()
    {
        ClientGuardian.Create(Guid.NewGuid(), new string('a', ClientContact.NameMaxLength), "Mãe", null, null)
            .IsSuccess.Should().BeTrue();
        ClientGuardian.Create(Guid.NewGuid(), new string('a', ClientContact.NameMaxLength + 1), "Mãe", null, null)
            .IsFailure.Should().BeTrue();
        ClientGuardian.Create(Guid.NewGuid(), "Ana", new string('a', ClientContact.RelationshipMaxLength), null, null)
            .IsSuccess.Should().BeTrue();
        ClientGuardian.Create(Guid.NewGuid(), "Ana", new string('a', ClientContact.RelationshipMaxLength + 1), null, null)
            .IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ReferenceContact_Create_StoresThePurposesAsFlags()
    {
        var result = ClientReferenceContact.Create(
            Guid.NewGuid(), " Carlos Lima ", " Tio ", ClientTestData.Phone("11 4000-1000"), ["emergency", "dailyCommunication"]);

        result.IsSuccess.Should().BeTrue();
        var contact = result.Value;
        contact.Name.Should().Be("Carlos Lima");
        contact.Relationship.Should().Be("Tio");
        contact.Phone!.Value.Should().Be("11 4000-1000");
        contact.Purposes.Should().Be(ContactPurpose.Emergency | ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void ReferenceContact_Create_WithoutAnyPurpose_Fails()
    {
        var result = ClientReferenceContact.Create(Guid.NewGuid(), "Carlos Lima", "Tio", null, []);

        result.IsFailure.Should().BeTrue();
        result.Error.Message.Should().Contain("finalidade");
    }

    [Fact]
    public void ReferenceContact_Create_WithAnUnknownPurpose_Fails()
    {
        ClientReferenceContact.Create(Guid.NewGuid(), "Carlos Lima", "Tio", null, ["billing"])
            .IsFailure.Should().BeTrue();
    }

    [Theory]
    [InlineData("", "Tio")]
    [InlineData("Carlos Lima", "")]
    public void ReferenceContact_Create_WithoutNameOrRelationship_Fails(string name, string relationship)
    {
        ClientReferenceContact.Create(Guid.NewGuid(), name, relationship, null, ["emergency"])
            .IsFailure.Should().BeTrue();
    }
}
