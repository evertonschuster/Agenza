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
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                ClientTestData.Birth(birthDate),
                ClientTestData.Phone(),
                ClientTestData.Email("paula@example.com"),
                ClientTestData.Cpf(),
                guardians: Enumerable.Range(0, guardians).Select(index => ClientTestData.Guardian($"Responsável {index}")).ToArray(),
                referenceContacts: Enumerable.Range(0, referenceContacts).Select(_ => ClientTestData.ReferenceContact()).ToArray()),
            Today).Value;
    }

    private static DomainResult Update(
        Client client,
        IReadOnlyCollection<GuardianData>? guardians = null,
        IReadOnlyCollection<ReferenceContactData>? referenceContacts = null,
        string fullName = "Paula Souza",
        DateOnly? birthDate = null)
    {
        return client.Update(
            ClientTestData.Data(
                ClientTestData.Name(fullName),
                ClientTestData.Birth(birthDate),
                guardians: guardians,
                referenceContacts: referenceContacts),
            Today);
    }

    [Fact]
    public void Update_ReplacesEveryPersonFieldAndEveryContact()
    {
        var client = ClientWithContacts();
        var id = client.Id;
        var oldGuardianId = client.Guardians.Single().Id;
        var oldReferenceContactId = client.ReferenceContacts.Single().Id;
        var notes = AdministrativeNotes.Create("Prefere a tarde.").Value;
        GuardianData[] guardians = [new GuardianData("Ana Lima", "Tia", ClientTestData.Phone(), ClientTestData.Cpf())];
        var purposes = ClientTestData.Purposes(ContactPurpose.OperationalSupport, ContactPurpose.DailyCommunication);
        ReferenceContactData[] referenceContacts = [new ReferenceContactData(ClientTestData.Name("Carlos Dias"), "Primo", null, purposes)];

        var result = client.Update(
            ClientTestData.Data(
                ClientTestData.Name("Paula Souza"),
                BirthDate.Restore(new DateOnly(1990, 5, 20)),
                ClientTestData.Phone("11 4000-1000"),
                ClientTestData.Email("souza@example.com"),
                ClientTestData.Cpf(ClientTestData.OtherValidCpf),
                notes,
                guardians,
                referenceContacts),
            Today);

        result.IsSuccess.Should().BeTrue();
        client.Id.Should().Be(id);
        client.Status.Should().Be(ClientStatus.Active);
        client.FullName.Should().Be(ClientTestData.Name("Paula Souza"));
        client.BirthDate!.Value.Should().Be(new DateOnly(1990, 5, 20));
        client.Phone.Should().Be(ClientTestData.Phone("11 4000-1000"));
        client.Email.Should().Be(ClientTestData.Email("souza@example.com"));
        client.Cpf.Should().Be(ClientTestData.Cpf(ClientTestData.OtherValidCpf));
        client.AdministrativeNotes.Should().Be(notes);
        var guardian = client.Guardians.Should().ContainSingle().Subject;
        guardian.Id.Should().NotBe(oldGuardianId);
        guardian.Name.Should().Be("Ana Lima");
        guardian.ClientId.Should().Be(client.Id);
        var referenceContact = client.ReferenceContacts.Should().ContainSingle().Subject;
        referenceContact.Id.Should().NotBe(oldReferenceContactId);
        referenceContact.Name.Should().Be("Carlos Dias");
        referenceContact.Purposes.Should().BeEquivalentTo([ContactPurpose.OperationalSupport, ContactPurpose.DailyCommunication]);
    }

    [Fact]
    public void Update_WithEmptyLists_RemovesEveryContact()
    {
        var client = ClientWithContacts(guardians: 2, referenceContacts: 2);

        Update(client).IsSuccess.Should().BeTrue();

        client.Guardians.Should().BeEmpty();
        client.ReferenceContacts.Should().BeEmpty();
    }

    [Fact]
    public void Update_WithAnInvalidContact_LeavesTheAggregateUntouched()
    {
        var client = ClientWithContacts(guardians: 2);
        var oldGuardianIds = client.Guardians.Select(guardian => guardian.Id).ToArray();

        var result = Update(
            client,
            [ClientTestData.Guardian("Nome Novo"), new GuardianData("A", "Mãe", null, null)]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientContact.InvalidNameLength");
        client.FullName.Should().Be(ClientTestData.Name("Paula Rocha"));
        client.Guardians.Select(guardian => guardian.Id).Should().Equal(oldGuardianIds);
    }

    [Fact]
    public void Update_WithAReferenceContactWithoutPurposes_LeavesTheAggregateUntouched()
    {
        var client = ClientWithContacts();
        var oldReferenceContactId = client.ReferenceContacts.Single().Id;

        var result = Update(
            client,
            referenceContacts: [new ReferenceContactData(ClientTestData.Name("Carlos Dias"), "Primo", null, ClientTestData.Purposes())]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("ClientReferenceContact.PurposesRequired");
        client.FullName.Should().Be(ClientTestData.Name("Paula Rocha"));
        client.ReferenceContacts.Single().Id.Should().Be(oldReferenceContactId);
    }

    [Fact]
    public void Update_WithMinorBirthDateAndNoGuardian_LeavesTheAggregateUntouched()
    {
        var client = ClientWithContacts(guardians: 1);

        var result = Update(client, birthDate: new DateOnly(2015, 3, 10));

        result.Error.Code.Should().Be("Client.GuardianRequired");
        client.BirthDate.Should().BeNull();
        client.Guardians.Should().ContainSingle();
    }

    [Fact]
    public void Update_WithANewGuardian_SatisfiesTheMinorRule()
    {
        var client = ClientWithContacts(guardians: 0);

        var result = Update(client, [ClientTestData.Guardian()], birthDate: new DateOnly(2015, 3, 10));

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
    public void Update_WithMoreContactsThanAllowed_Fails()
    {
        var client = ClientWithContacts();
        var guardians = Enumerable.Range(0, Client.MaxGuardians + 1).Select(_ => ClientTestData.Guardian()).ToArray();
        var referenceContacts = Enumerable.Range(0, Client.MaxReferenceContacts + 1)
            .Select(_ => ClientTestData.ReferenceContact())
            .ToArray();

        Update(client, guardians).Error.Code.Should().Be("Client.TooManyGuardians");
        Update(client, referenceContacts: referenceContacts).Error.Code.Should().Be("Client.TooManyReferenceContacts");
    }

    private static Client ClientWithTags(params Guid[] tagIds)
    {
        return Client.Create(ClientTestData.Data(ClientTestData.Name("Paula Rocha"), tagIds: tagIds), Today).Value;
    }

    private static DomainResult UpdateTags(Client client, params Guid[] tagIds)
    {
        return client.Update(ClientTestData.Data(ClientTestData.Name("Paula Rocha"), tagIds: tagIds), Today);
    }

    [Fact]
    public void Update_KeepsTheLinkOfATagThatStaysAndReplacesTheOthers()
    {
        var kept = Guid.NewGuid();
        var removed = Guid.NewGuid();
        var added = Guid.NewGuid();
        var client = ClientWithTags(kept, removed);
        var keptLinkId = client.Tags.Single(tag => tag.TagId == kept).Id;

        var result = UpdateTags(client, kept, added);

        result.IsSuccess.Should().BeTrue();
        client.Tags.Select(tag => tag.TagId).Should().BeEquivalentTo([kept, added]);
        client.Tags.Single(tag => tag.TagId == kept).Id.Should().Be(keptLinkId);
        client.Tags.Single(tag => tag.TagId == added).ClientId.Should().Be(client.Id);
    }

    [Fact]
    public void Update_WithNoTags_RemovesEveryTag()
    {
        var client = ClientWithTags(Guid.NewGuid(), Guid.NewGuid());

        UpdateTags(client).IsSuccess.Should().BeTrue();

        client.Tags.Should().BeEmpty();
    }

    [Fact]
    public void Update_WithInvalidTags_LeavesTheAggregateUntouched()
    {
        var tagId = Guid.NewGuid();
        var client = ClientWithTags(tagId);
        var linkId = client.Tags.Single().Id;
        var tooMany = Enumerable.Range(0, Client.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray();

        var tooManyResult = client.Update(ClientTestData.Data(ClientTestData.Name("Outro Nome"), tagIds: tooMany), Today);
        var repeatedResult = client.Update(ClientTestData.Data(ClientTestData.Name("Outro Nome"), tagIds: [tagId, tagId]), Today);

        tooManyResult.Error.Code.Should().Be("Client.TooManyTags");
        repeatedResult.Error.Code.Should().Be("Client.DuplicateTag");
        client.FullName.Value.Should().Be("Paula Rocha");
        client.Tags.Should().ContainSingle().Which.Id.Should().Be(linkId);
    }

    [Fact]
    public void Update_RefusedByAnotherRule_LeavesTheTagsUntouched()
    {
        var tagId = Guid.NewGuid();
        var client = ClientWithTags(tagId);

        var result = client.Update(
            ClientTestData.Data(ClientTestData.Name("Paula Rocha"), ClientTestData.Birth(new DateOnly(2015, 3, 10)), tagIds: [Guid.NewGuid()]),
            Today);

        result.Error.Code.Should().Be("Client.GuardianRequired");
        client.Tags.Should().ContainSingle().Which.TagId.Should().Be(tagId);
    }
}
