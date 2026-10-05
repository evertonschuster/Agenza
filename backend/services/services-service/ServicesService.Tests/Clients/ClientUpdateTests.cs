using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class ClientUpdateTests
{
    private static readonly DateOnly Today = ClientTestData.Today;

    private static Client ClientWithContacts(
        DateOnly? birthDate = null,
        int guardians = 1,
        int referenceContacts = 1)
    {
        return Client.Create(
            Guid.NewGuid(),
            ClientTestData.Name("Paula Rocha"),
            BirthDate.Create(birthDate, Today).Value,
            ClientTestData.Phone(),
            ClientTestData.Email("paula@example.com"),
            ClientTestData.Cpf(),
            null,
            Today,
            Enumerable.Range(0, guardians).Select(index => ClientTestData.Guardian($"Responsável {index}")).ToArray(),
            Enumerable.Range(0, referenceContacts).Select(_ => ClientTestData.ReferenceContact()).ToArray()).Value;
    }

    private static ContactChange<GuardianData> Keep(ClientGuardian guardian, string? name = null)
    {
        return new ContactChange<GuardianData>(guardian.Id, ClientTestData.Guardian(name ?? guardian.Name));
    }

    private static ContactChange<GuardianData> NewGuardian(string name = "Nova Responsável")
    {
        return new ContactChange<GuardianData>(null, ClientTestData.Guardian(name));
    }

    private static ContactChange<ReferenceContactData> Keep(ClientReferenceContact contact)
    {
        return new ContactChange<ReferenceContactData>(contact.Id, ClientTestData.ReferenceContact());
    }

    private static ContactChange<ReferenceContactData> NewReferenceContact()
    {
        return new ContactChange<ReferenceContactData>(null, ClientTestData.ReferenceContact(ContactPurpose.DailyCommunication));
    }

    private static DomainResult Update(
        Client client,
        IReadOnlyCollection<ContactChange<GuardianData>>? guardians = null,
        IReadOnlyCollection<ContactChange<ReferenceContactData>>? referenceContacts = null,
        string fullName = "Paula Souza",
        DateOnly? birthDate = null)
    {
        return client.Update(
            ClientTestData.Name(fullName),
            BirthDate.Create(birthDate, Today).Value,
            null,
            null,
            null,
            null,
            Today,
            guardians ?? [],
            referenceContacts ?? []);
    }

    [Fact]
    public void Update_ReplacesEveryPersonFieldAndKeepsIdentityAndStatus()
    {
        var client = ClientWithContacts();
        var id = client.Id;
        var notes = AdministrativeNotes.Create("Prefere a tarde.").Value;

        var result = client.Update(
            ClientTestData.Name("Paula Souza"),
            BirthDate.Restore(new DateOnly(1990, 5, 20)),
            ClientTestData.Phone("11 4000-1000"),
            ClientTestData.Email("souza@example.com"),
            ClientTestData.Cpf(ClientTestData.OtherValidCpf),
            notes,
            Today,
            [],
            []);

        result.IsSuccess.Should().BeTrue();
        client.Id.Should().Be(id);
        client.Status.Should().Be(ClientStatus.Active);
        client.FullName.Should().Be(ClientTestData.Name("Paula Souza"));
        client.BirthDate!.Value.Should().Be(new DateOnly(1990, 5, 20));
        client.Phone.Should().Be(ClientTestData.Phone("11 4000-1000"));
        client.Email.Should().Be(ClientTestData.Email("souza@example.com"));
        client.Cpf.Should().Be(ClientTestData.Cpf(ClientTestData.OtherValidCpf));
        client.AdministrativeNotes.Should().Be(notes);
    }

    [Fact]
    public void Update_ClearsEveryOptionalFieldItReceivesAsNull()
    {
        var client = ClientWithContacts();

        Update(client).IsSuccess.Should().BeTrue();

        client.BirthDate.Should().BeNull();
        client.Phone.Should().BeNull();
        client.Email.Should().BeNull();
        client.Cpf.Should().BeNull();
        client.AdministrativeNotes.Should().BeNull();
    }

    [Fact]
    public void Update_KeepsAnExistingContactByIdAndChangesItsData()
    {
        var client = ClientWithContacts();
        var guardian = client.Guardians.Single();
        var contact = client.ReferenceContacts.Single();
        var change = new ContactChange<GuardianData>(
            guardian.Id,
            new GuardianData(" Ana Lima ", " Tia ", ClientTestData.Phone(), ClientTestData.Cpf()));
        var purposes = ContactPurposes.Create(ContactPurpose.OperationalSupport | ContactPurpose.DailyCommunication).Value;
        var contactChange = new ContactChange<ReferenceContactData>(
            contact.Id,
            new ReferenceContactData("Carlos Dias", "Primo", null, purposes));

        var result = Update(client, [change], [contactChange]);

        result.IsSuccess.Should().BeTrue();
        var keptGuardian = client.Guardians.Should().ContainSingle().Subject;
        keptGuardian.Should().BeSameAs(guardian);
        keptGuardian.Name.Should().Be("Ana Lima");
        keptGuardian.Relationship.Should().Be("Tia");
        keptGuardian.Phone.Should().Be(ClientTestData.Phone());
        keptGuardian.Cpf.Should().Be(ClientTestData.Cpf());
        var keptContact = client.ReferenceContacts.Should().ContainSingle().Subject;
        keptContact.Should().BeSameAs(contact);
        keptContact.Name.Should().Be("Carlos Dias");
        keptContact.Relationship.Should().Be("Primo");
        keptContact.Phone.Should().BeNull();
        keptContact.Purposes.Should().Be(purposes);
    }

    [Fact]
    public void Update_AddsAContactWithoutIdAsANewOneLinkedToTheClient()
    {
        var client = ClientWithContacts();
        var existingGuardian = client.Guardians.Single();

        var result = Update(
            client,
            [Keep(existingGuardian), NewGuardian()],
            [Keep(client.ReferenceContacts.Single()), NewReferenceContact()]);

        result.IsSuccess.Should().BeTrue();
        client.Guardians.Should().HaveCount(2);
        var added = client.Guardians.Single(guardian => guardian.Id != existingGuardian.Id);
        added.Id.Should().NotBe(Guid.Empty);
        added.ClientId.Should().Be(client.Id);
        added.TenantId.Should().Be(Guid.Empty);
        added.Name.Should().Be("Nova Responsável");
        client.ReferenceContacts.Should().HaveCount(2);
        client.ReferenceContacts.Should().OnlyContain(contact => contact.ClientId == client.Id);
    }

    [Fact]
    public void Update_RemovesTheContactsTheRequestOmits()
    {
        var client = ClientWithContacts(guardians: 3, referenceContacts: 2);
        var keptGuardian = client.Guardians.ElementAt(1);
        var keptContact = client.ReferenceContacts.ElementAt(0);

        var result = Update(client, [Keep(keptGuardian)], [Keep(keptContact)]);

        result.IsSuccess.Should().BeTrue();
        client.Guardians.Should().ContainSingle().Which.Should().BeSameAs(keptGuardian);
        client.ReferenceContacts.Should().ContainSingle().Which.Should().BeSameAs(keptContact);
    }

    [Fact]
    public void Update_WithNoContacts_RemovesAllOfThem()
    {
        var client = ClientWithContacts(guardians: 2, referenceContacts: 2);

        Update(client).IsSuccess.Should().BeTrue();

        client.Guardians.Should().BeEmpty();
        client.ReferenceContacts.Should().BeEmpty();
    }

    [Fact]
    public void Update_CanAddChangeAndRemoveContactsInTheSameCall()
    {
        var client = ClientWithContacts(guardians: 2);
        var kept = client.Guardians.ElementAt(0);
        var removed = client.Guardians.ElementAt(1);

        var result = Update(client, [Keep(kept, "Nome Novo"), NewGuardian("Responsável Extra")]);

        result.IsSuccess.Should().BeTrue();
        client.Guardians.Select(guardian => guardian.Name).Should().BeEquivalentTo("Nome Novo", "Responsável Extra");
        client.Guardians.Should().NotContain(removed);
    }

    [Fact]
    public void Update_WithAnIdThatIsNotAGuardianOfTheClient_FailsAndChangesNothing()
    {
        var client = ClientWithContacts();
        var stranger = ClientWithContacts().Guardians.Single();

        var result = Update(client, [new ContactChange<GuardianData>(stranger.Id, ClientTestData.Guardian())]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.ContactNotFound");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithAnIdThatIsNotAReferenceContactOfTheClient_FailsAndChangesNothing()
    {
        var client = ClientWithContacts();

        var result = Update(
            client,
            referenceContacts: [new ContactChange<ReferenceContactData>(Guid.NewGuid(), ClientTestData.ReferenceContact())]);

        result.Error.Code.Should().Be("Client.ContactNotFound");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithAReferenceContactIdInTheGuardianList_FailsAsNotFound()
    {
        var client = ClientWithContacts();

        var result = Update(
            client,
            [new ContactChange<GuardianData>(client.ReferenceContacts.Single().Id, ClientTestData.Guardian())]);

        result.Error.Code.Should().Be("Client.ContactNotFound");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithTheSameContactTwice_FailsAndChangesNothing()
    {
        var client = ClientWithContacts();
        var guardian = client.Guardians.Single();

        var result = Update(client, [Keep(guardian), Keep(guardian, "Outro Nome")]);

        result.Error.Code.Should().Be("Client.DuplicateContact");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithAnInvalidContactAfterValidOnes_ChangesNothing()
    {
        var client = ClientWithContacts(guardians: 2);
        var first = client.Guardians.ElementAt(0);

        var result = Update(
            client,
            [Keep(first, "Nome Novo"), new ContactChange<GuardianData>(null, new GuardianData("A", "Mãe", null, null))]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientContact.InvalidNameLength");
        AssertUntouched(client, guardians: 2);
    }

    [Fact]
    public void Update_WithAnInvalidKeptContact_ChangesNothing()
    {
        var client = ClientWithContacts();
        var guardian = client.Guardians.Single();

        var result = Update(
            client,
            [new ContactChange<GuardianData>(guardian.Id, new GuardianData("Ana", "   ", null, null))]);

        result.Error.Code.Should().Be("ClientContact.RelationshipRequired");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithAnInvalidReferenceContact_ChangesNothing()
    {
        var client = ClientWithContacts();
        var purposes = ContactPurposes.Create(ContactPurpose.Emergency).Value;

        var result = Update(
            client,
            referenceContacts: [new ContactChange<ReferenceContactData>(null, new ReferenceContactData("", "Tio", null, purposes))]);

        result.Error.Code.Should().Be("ClientContact.NameRequired");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_WithMinorBirthDateAndNoGuardian_FailsAndChangesNothing()
    {
        var client = ClientWithContacts(guardians: 1);

        var result = Update(client, birthDate: new DateOnly(2015, 3, 10));

        result.Error.Code.Should().Be("Client.GuardianRequired");
        AssertUntouched(client);
    }

    [Fact]
    public void Update_CannotRemoveTheLastGuardianOfAMinor()
    {
        var client = ClientWithContacts(birthDate: new DateOnly(2015, 3, 10), guardians: 1);

        var result = Update(client, birthDate: new DateOnly(2015, 3, 10));

        result.Error.Code.Should().Be("Client.GuardianRequired");
        client.Guardians.Should().HaveCount(1);
    }

    [Fact]
    public void Update_KeepsAMinorValidWhileAGuardianRemains()
    {
        var client = ClientWithContacts(birthDate: new DateOnly(2015, 3, 10), guardians: 2);

        var result = Update(client, [Keep(client.Guardians.First())], birthDate: new DateOnly(2015, 3, 10));

        result.IsSuccess.Should().BeTrue();
        client.Guardians.Should().HaveCount(1);
    }

    [Fact]
    public void Update_WithANewGuardianSatisfiesTheMinorRule()
    {
        var client = ClientWithContacts(guardians: 0);

        var result = Update(client, [NewGuardian()], birthDate: new DateOnly(2015, 3, 10));

        result.IsSuccess.Should().BeTrue();
        client.Guardians.Should().ContainSingle();
    }

    [Fact]
    public void Update_WithoutBirthDate_NeverRequiresAGuardian()
    {
        var client = ClientWithContacts(birthDate: new DateOnly(2015, 3, 10), guardians: 1);

        var result = Update(client, birthDate: null);

        result.IsSuccess.Should().BeTrue();
        client.BirthDate.Should().BeNull();
        client.Guardians.Should().BeEmpty();
    }

    [Fact]
    public void Update_OnTheEighteenthBirthday_NoLongerRequiresAGuardian()
    {
        var client = ClientWithContacts(guardians: 0);

        Update(client, birthDate: new DateOnly(2008, 10, 3)).IsFailure.Should().BeTrue();
        Update(client, birthDate: new DateOnly(2008, 10, 2)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Update_WithMoreContactsThanAllowed_Fails()
    {
        var client = ClientWithContacts();
        var tooManyGuardians = Enumerable.Range(0, Client.MaxGuardians + 1).Select(_ => NewGuardian()).ToArray();
        var tooManyReferenceContacts = Enumerable.Range(0, Client.MaxReferenceContacts + 1)
            .Select(_ => NewReferenceContact())
            .ToArray();

        Update(client, tooManyGuardians).Error.Code.Should().Be("Client.TooManyGuardians");
        Update(client, referenceContacts: tooManyReferenceContacts).Error.Code.Should().Be("Client.TooManyReferenceContacts");
        Update(client, tooManyGuardians[..Client.MaxGuardians]).IsSuccess.Should().BeTrue();
        client.Guardians.Should().HaveCount(Client.MaxGuardians);
    }

    private static void AssertUntouched(Client client, int guardians = 1)
    {
        client.FullName.Should().Be(ClientTestData.Name("Paula Rocha"));
        client.BirthDate.Should().BeNull();
        client.Phone.Should().Be(ClientTestData.Phone());
        client.Email.Should().Be(ClientTestData.Email("paula@example.com"));
        client.Cpf.Should().Be(ClientTestData.Cpf());
        client.Guardians.Select(guardian => guardian.Name)
            .Should().Equal(Enumerable.Range(0, guardians).Select(index => $"Responsável {index}"));
        client.ReferenceContacts.Should().ContainSingle().Which.Name.Should().Be("Carlos Lima");
    }
}
