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
    public void Guardian_Create_NormalizesPhoneAndCpf()
    {
        var guardian = ClientGuardian.Create(
            Guid.NewGuid(), "Ana Souza", "Mãe", " (11) 99999-0000 ", ClientTestData.ValidCpf).Value;

        guardian.Phone.Should().Be("(11) 99999-0000");
        guardian.Cpf.Should().Be(ClientTestData.ValidCpfDigits);
    }

    [Theory]
    [InlineData("", "Mãe")]
    [InlineData("A", "Mãe")]
    [InlineData("   ", "Mãe")]
    [InlineData("Ana Souza", "")]
    [InlineData("Ana Souza", "   ")]
    public void Guardian_Create_WithoutNameOrRelationship_Fails(string name, string relationship)
    {
        var result = ClientGuardian.Create(Guid.NewGuid(), name, relationship, null, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.Invalid");
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

    [Theory]
    [InlineData("telefone", null)]
    [InlineData(null, "529.982.247-24")]
    public void Guardian_Create_WithInvalidPhoneOrCpf_Fails(string? phone, string? cpf)
    {
        ClientGuardian.Create(Guid.NewGuid(), "Ana Souza", "Mãe", phone, cpf).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void ReferenceContact_Create_StoresThePurposesAsFlags()
    {
        var result = ClientReferenceContact.Create(
            Guid.NewGuid(), " Carlos Lima ", " Tio ", "11 4000-1000", ["emergency", "dailyCommunication"]);

        result.IsSuccess.Should().BeTrue();
        var contact = result.Value;
        contact.Name.Should().Be("Carlos Lima");
        contact.Relationship.Should().Be("Tio");
        contact.Phone.Should().Be("11 4000-1000");
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

    [Fact]
    public void ReferenceContact_Create_WithInvalidPhone_Fails()
    {
        ClientReferenceContact.Create(Guid.NewGuid(), "Carlos Lima", "Tio", "telefone", ["emergency"])
            .IsFailure.Should().BeTrue();
    }
}
