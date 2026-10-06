namespace ServicesService.Tests.Clients;

public class ClientTests
{
    private static readonly DateOnly Today = ClientTestData.Today;

    private static DomainResult<Client> Create(
        DateOnly? birthDate = null,
        GuardianData[]? guardians = null,
        ReferenceContactData[]? referenceContacts = null) =>
        Client.Create(
            Guid.NewGuid(),
            ClientTestData.Name(),
            ClientTestData.Birth(birthDate),
            null,
            null,
            null,
            null,
            Today,
            guardians ?? [],
            referenceContacts ?? []);

    [Fact]
    public void Create_WithOnlyTheRequiredName_StartsActiveWithoutTenantOrContacts()
    {
        var id = Guid.NewGuid();

        var result = Client.Create(id, ClientTestData.Name(), null, null, null, null, null, Today, [], []);

        result.IsSuccess.Should().BeTrue();
        var client = result.Value;
        client.Id.Should().Be(id);
        client.TenantId.Should().Be(Guid.Empty);
        client.Status.Should().Be(ClientStatus.Active);
        client.FullName.Should().Be(ClientTestData.Name());
        client.BirthDate.Should().BeNull();
        client.Phone.Should().BeNull();
        client.Email.Should().BeNull();
        client.Cpf.Should().BeNull();
        client.AdministrativeNotes.Should().BeNull();
        client.Guardians.Should().BeEmpty();
        client.ReferenceContacts.Should().BeEmpty();
    }

    [Fact]
    public void Create_KeepsEveryValueObjectItReceives()
    {
        var notes = ClientTestData.Notes();

        var client = Client.Create(
            Guid.NewGuid(),
            ClientTestData.Name(),
            BirthDate.Restore(new DateOnly(1990, 5, 20)),
            ClientTestData.Phone(),
            ClientTestData.Email(),
            ClientTestData.Cpf(),
            notes,
            Today,
            [],
            []).Value;

        client.BirthDate!.Value.Should().Be(new DateOnly(1990, 5, 20));
        client.Phone.Should().Be(ClientTestData.Phone());
        client.Email.Should().Be(ClientTestData.Email());
        client.Cpf!.Value.Should().Be(ClientTestData.ValidCpfDigits);
        client.AdministrativeNotes.Should().Be(notes);
    }

    [Fact]
    public void Create_WithoutBirthDate_NeverRequiresAGuardian()
    {
        var result = Create(birthDate: null, guardians: []);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithMinorBirthDateAndNoGuardian_Fails()
    {
        var result = Create(birthDate: new DateOnly(2015, 3, 10), guardians: []);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.GuardianRequired");
        result.Error.Message.Should().Contain("responsável");
    }

    [Fact]
    public void Create_WithMinorBirthDateAndAGuardian_CreatesTheContactsLinkedToTheClient()
    {
        var result = Create(
            birthDate: new DateOnly(2015, 3, 10),
            guardians: [ClientTestData.Guardian()],
            referenceContacts: [ClientTestData.ReferenceContact(ContactPurpose.Emergency | ContactPurpose.OperationalSupport)]);

        result.IsSuccess.Should().BeTrue();
        var client = result.Value;
        var guardian = client.Guardians.Should().ContainSingle().Subject;
        guardian.Id.Should().NotBe(Guid.Empty);
        guardian.ClientId.Should().Be(client.Id);
        guardian.Name.Should().Be("Ana Souza");
        var reference = client.ReferenceContacts.Should().ContainSingle().Subject;
        reference.ClientId.Should().Be(client.Id);
        reference.Purposes.Value.Should().Be(ContactPurpose.Emergency | ContactPurpose.OperationalSupport);
    }

    [Fact]
    public void Create_ADayBeforeTheEighteenthBirthday_RequiresAGuardian()
    {
        Create(birthDate: new DateOnly(2008, 10, 3)).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Create_OnTheEighteenthBirthday_NoLongerRequiresAGuardian()
    {
        Create(birthDate: new DateOnly(2008, 10, 2)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithAdultBirthDate_DoesNotRequireAGuardian()
    {
        Create(birthDate: new DateOnly(1985, 1, 31)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithMoreGuardiansThanAllowed_Fails()
    {
        var guardians = Enumerable.Range(0, Client.MaxGuardians + 1).Select(_ => ClientTestData.Guardian()).ToArray();

        Create(guardians: guardians).IsFailure.Should().BeTrue();
        Create(guardians: guardians[..Client.MaxGuardians]).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithMoreReferenceContactsThanAllowed_Fails()
    {
        var contacts = Enumerable.Range(0, Client.MaxReferenceContacts + 1)
            .Select(_ => ClientTestData.ReferenceContact())
            .ToArray();

        Create(referenceContacts: contacts).IsFailure.Should().BeTrue();
        Create(referenceContacts: contacts[..Client.MaxReferenceContacts]).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var client = Create().Value;
        var tenantId = Guid.NewGuid();

        client.AssignTenant(tenantId);

        client.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var client = Create().Value;

        var act = () => client.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidOperationException>();
    }
}
