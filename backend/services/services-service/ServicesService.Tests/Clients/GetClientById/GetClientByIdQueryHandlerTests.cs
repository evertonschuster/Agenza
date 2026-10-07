using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.GetClientById;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Clients.GetClientById;

public class GetClientByIdQueryHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly GetClientByIdQueryHandler _handler;

    public GetClientByIdQueryHandlerTests()
    {
        _handler = new GetClientByIdQueryHandler(_repository);
    }

    private void Stores(Client client)
    {
        _repository.GetByIdAsync(client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(client));
    }

    private static Client CompleteClient()
    {
        return Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                birthDate: ClientTestData.Birth(new DateOnly(2015, 3, 10)),
                phone: ClientTestData.Phone(),
                email: ClientTestData.Email("paula@example.com"),
                cpf: ClientTestData.Cpf(),
                notes: ClientTestData.Notes(),
                guardians:
                [
                    new GuardianData("Ana Souza", "Mãe", ClientTestData.Phone("(11) 98888-0000"), ClientTestData.Cpf(ClientTestData.OtherValidCpf)),
                    ClientTestData.Guardian("Bia Souza", "Tia"),
                ],
                referenceContacts:
                [
                    ClientTestData.ReferenceContact(ContactPurpose.DailyCommunication, ContactPurpose.Emergency),
                ]),
            ClientTestData.Today).Value;
    }

    private static void MakeInactive(Client client)
    {
        typeof(Client).GetProperty(nameof(Client.Status))!.SetValue(client, ClientStatus.Inactive);
    }

    [Fact]
    public async Task Handle_WithAnExistingClient_ReturnsEveryPersonField()
    {
        var client = CompleteClient();
        Stores(client);

        var result = await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Id.Should().Be(client.Id);
        response.FullName.Should().Be("Paula Rocha");
        response.BirthDate.Should().Be(new DateOnly(2015, 3, 10));
        response.Phone.Should().Be("(11) 99999-0000");
        response.Email.Should().Be("paula@example.com");
        response.Cpf.Should().Be("52998224725");
        response.AdministrativeNotes.Should().Be("Prefere atendimento à tarde.");
        response.Status.Should().Be("active");
    }

    [Fact]
    public async Task Handle_ReturnsTheGuardiansWithTheirFullCpf()
    {
        var client = CompleteClient();
        Stores(client);

        var result = await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        var guardians = result.Value.Guardians;
        guardians.Select(guardian => guardian.Name).Should().Equal("Ana Souza", "Bia Souza");
        guardians.Select(guardian => guardian.Id).Should().BeEquivalentTo(client.Guardians.Select(guardian => guardian.Id));
        var first = guardians.First();
        first.Relationship.Should().Be("Mãe");
        first.Phone.Should().Be("(11) 98888-0000");
        first.Cpf.Should().Be("12345678909");
        var second = guardians.Last();
        second.Phone.Should().BeNull();
        second.Cpf.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ReturnsTheReferenceContactsWithTheirPurposes()
    {
        var client = CompleteClient();
        Stores(client);

        var result = await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        var contact = result.Value.ReferenceContacts.Should().ContainSingle().Subject;
        contact.Id.Should().Be(client.ReferenceContacts.Single().Id);
        contact.Name.Should().Be("Carlos Lima");
        contact.Relationship.Should().Be("Tio");
        contact.Phone.Should().BeNull();
        contact.Purposes.Should().Equal(ContactPurpose.Emergency, ContactPurpose.DailyCommunication);
    }

    [Fact]
    public async Task Handle_WithoutABirthDate_ReturnsNoBirthDate()
    {
        var client = ClientTestData.ExistingClient();
        Stores(client);

        var result = await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.BirthDate.Should().BeNull();
        result.Value.Guardians.Should().BeEmpty();
        result.Value.ReferenceContacts.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_ForAnInactiveClient_ReturnsItWithTheInactiveSituation()
    {
        var client = CompleteClient();
        MakeInactive(client);
        Stores(client);

        var result = await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(client.Id);
        result.Value.Status.Should().Be("inactive");
        result.Value.Guardians.Should().HaveCount(2);
        result.Value.ReferenceContacts.Should().ContainSingle();
    }

    [Fact]
    public async Task Handle_WithAnIdTheRepositoryDoesNotKnow_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(null));

        var result = await _handler.Handle(new GetClientByIdQuery(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Client.NotFound");
        result.Error.Message.Should().Be("A pessoa não foi encontrada.");
    }

    [Fact]
    public async Task Handle_OnlyReadsTheRequestedClient()
    {
        var client = CompleteClient();
        Stores(client);

        await _handler.Handle(new GetClientByIdQuery(client.Id), CancellationToken.None);

        await _repository.Received(1).GetByIdAsync(client.Id, Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }
}
