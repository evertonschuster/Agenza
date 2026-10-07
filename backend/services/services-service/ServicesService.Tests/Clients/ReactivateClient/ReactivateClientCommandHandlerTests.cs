using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.ReactivateClient;

namespace ServicesService.Tests.Clients.ReactivateClient;

public class ReactivateClientCommandHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<ReactivateClientCommandHandler> _logger = Substitute.For<ILogger<ReactivateClientCommandHandler>>();
    private readonly Client _client = InactiveClientWithContacts();

    public ReactivateClientCommandHandlerTests()
    {
        _repository.GetByIdAsync(_client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(_client));
        _repository.UpdateStatusAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _repository.FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(null));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
    }

    private ReactivateClientCommandHandler Handler() => new(_repository, _unitOfWork, _logger);

    private static Client InactiveClientWithContacts(EmailAddress? email = null)
    {
        var client = Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                email: email ?? ClientTestData.Email("paula@example.com"),
                guardians: [ClientTestData.Guardian("Ana Souza"), ClientTestData.Guardian("Bia Souza")],
                referenceContacts: [ClientTestData.ReferenceContact()]),
            ClientTestData.Today).Value;
        client.Inactivate();
        return client;
    }

    private async Task AssertNothingWasPersisted()
    {
        await _repository.DidNotReceive().UpdateStatusAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithAnEmailNoOtherActiveClientUses_ReactivatesTheClientAndSavesItsStatus()
    {
        var result = await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(_client.Id);
        result.Value.Status.Should().Be("active");
        _client.Status.Should().Be(ClientStatus.Active);
        await _repository.Received(1).UpdateStatusAsync(_client, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Handle_ChecksTheEmailOfTheClientExcludingTheClientItself()
    {
        await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        await _repository.Received(1).FindActiveByEmailAsync(
            ClientTestData.Email("paula@example.com"),
            _client.Id,
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutAnEmail_ReactivatesWithoutCheckingUniqueness()
    {
        var client = Client.Create(ClientTestData.Data(), ClientTestData.Today).Value;
        client.Inactivate();
        _repository.GetByIdAsync(client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(client));

        var result = await Handler().Handle(new ReactivateClientCommand(client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be("active");
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_KeepsTheDataAndEveryContactOfTheClient()
    {
        var guardianIds = _client.Guardians.Select(guardian => guardian.Id).ToArray();
        var referenceContactId = _client.ReferenceContacts.Single().Id;

        var result = await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        var response = result.Value;
        response.FullName.Should().Be("Paula Rocha");
        response.Email.Should().Be("paula@example.com");
        response.Guardians.Select(guardian => guardian.Id).Should().BeEquivalentTo(guardianIds);
        response.ReferenceContacts.Should().ContainSingle().Which.Id.Should().Be(referenceContactId);
    }

    [Fact]
    public async Task Handle_WithTheEmailOfAnotherActiveClient_ReturnsAConflictPointingAtItAndKeepsTheClientInactive()
    {
        var other = ClientTestData.ExistingClient();
        _repository.FindActiveByEmailAsync(ClientTestData.Email("paula@example.com"), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(other));

        var result = await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.DuplicateEmail");
        result.Error.FieldErrors!.Keys.Should().Equal("Email");
        var fieldError = result.Error.FieldErrors["Email"].Should().ContainSingle().Subject;
        fieldError.Message.Should().Be(
            "Não é possível reativar esta pessoa porque outra pessoa ativa já usa este e-mail. Corrija o e-mail deste cadastro e tente novamente.");
        fieldError.Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["clientId"] = other.Id.ToString(),
            ["clientName"] = "Paula Rocha",
        });
        _client.Status.Should().Be(ClientStatus.Inactive);
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WithAnIdTheRepositoryDoesNotKnow_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(null));

        var result = await Handler().Handle(new ReactivateClientCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Client.NotFound");
        result.Error.Message.Should().Be("A pessoa não foi encontrada.");
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WhenTheClientIsAlreadyActive_ReturnsItsCurrentStateWithoutCheckingOrSaving()
    {
        _client.Reactivate();

        var result = await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(_client.Id);
        result.Value.Status.Should().Be("active");
        result.Value.Guardians.Should().HaveCount(2);
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_Email")));

        var result = await Handler().Handle(new ReactivateClientCommand(_client.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.SaveFailed");
        result.Error.FieldErrors.Should().BeNull();
    }
}
