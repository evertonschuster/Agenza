namespace ServicesService.Tests.Clients;

public class ClientStatusTests
{
    private static Client ClientWithContacts()
    {
        return Client.Create(
            ClientTestData.Data(
                birthDate: ClientTestData.Birth(new DateOnly(2015, 3, 10)),
                email: ClientTestData.Email(),
                cpf: ClientTestData.Cpf(),
                guardians: [ClientTestData.Guardian("Ana Souza"), ClientTestData.Guardian("Bia Souza")],
                referenceContacts: [ClientTestData.ReferenceContact()]),
            ClientTestData.Today).Value;
    }

    [Fact]
    public void Inactivate_OnAnActiveClient_MakesItInactive()
    {
        var client = ClientWithContacts();

        var result = client.Inactivate();

        result.IsSuccess.Should().BeTrue();
        client.Status.Should().Be(ClientStatus.Inactive);
    }

    [Fact]
    public void Inactivate_KeepsTheDataAndTheContactsOfTheClient()
    {
        var client = ClientWithContacts();
        var id = client.Id;
        var guardianIds = client.Guardians.Select(guardian => guardian.Id).ToArray();
        var referenceContactIds = client.ReferenceContacts.Select(contact => contact.Id).ToArray();

        client.Inactivate();

        client.Id.Should().Be(id);
        client.FullName.Should().Be(ClientTestData.Name());
        client.Email.Should().Be(ClientTestData.Email());
        client.Cpf.Should().Be(ClientTestData.Cpf());
        client.BirthDate!.Value.Should().Be(new DateOnly(2015, 3, 10));
        client.Guardians.Select(guardian => guardian.Id).Should().Equal(guardianIds);
        client.ReferenceContacts.Select(contact => contact.Id).Should().Equal(referenceContactIds);
    }

    [Fact]
    public void Inactivate_OnAnInactiveClient_IsRefusedWithAlreadyInactive()
    {
        var client = ClientWithContacts();
        client.Inactivate();

        var result = client.Inactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(Client.AlreadyInactive);
        result.Error.Code.Should().Be("Client.AlreadyInactive");
        client.Status.Should().Be(ClientStatus.Inactive);
    }

    [Fact]
    public void Reactivate_OnAnInactiveClient_MakesItActiveAgain()
    {
        var client = ClientWithContacts();
        client.Inactivate();

        var result = client.Reactivate();

        result.IsSuccess.Should().BeTrue();
        client.Status.Should().Be(ClientStatus.Active);
    }

    [Fact]
    public void Reactivate_KeepsTheIdentityAndTheContactsOfTheClient()
    {
        var client = ClientWithContacts();
        var id = client.Id;
        var guardianIds = client.Guardians.Select(guardian => guardian.Id).ToArray();
        var referenceContactIds = client.ReferenceContacts.Select(contact => contact.Id).ToArray();
        client.Inactivate();

        client.Reactivate();

        client.Id.Should().Be(id);
        client.Guardians.Select(guardian => guardian.Id).Should().Equal(guardianIds);
        client.ReferenceContacts.Select(contact => contact.Id).Should().Equal(referenceContactIds);
    }

    [Fact]
    public void Reactivate_OnAnActiveClient_IsRefusedWithAlreadyActive()
    {
        var client = ClientWithContacts();

        var result = client.Reactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(Client.AlreadyActive);
        result.Error.Code.Should().Be("Client.AlreadyActive");
        client.Status.Should().Be(ClientStatus.Active);
    }
}
