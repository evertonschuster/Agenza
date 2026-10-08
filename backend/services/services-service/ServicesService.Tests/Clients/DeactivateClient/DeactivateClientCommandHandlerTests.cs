using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.DeactivateClient;

namespace ServicesService.Tests.Clients.DeactivateClient;

public class DeactivateClientCommandHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Client _client = ClientWithContacts();

    public DeactivateClientCommandHandlerTests()
    {
        _repository.GetByIdAsync(_client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(_client));
        _repository.UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _appointments.HasUpcomingAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(false));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
    }

    private DeactivateClientCommandHandler Handler() => new(_repository, _appointments, _unitOfWork);

    private static Client ClientWithContacts()
    {
        return Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                email: ClientTestData.Email("paula@example.com"),
                guardians: [ClientTestData.Guardian("Ana Souza"), ClientTestData.Guardian("Bia Souza")],
                referenceContacts: [ClientTestData.ReferenceContact()]),
            ClientTestData.Today).Value;
    }

    private async Task AssertNothingWasPersisted()
    {
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNoUpcomingAppointment_InactivatesTheClientAndSavesItsStatus()
    {
        var result = await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(_client.Id);
        result.Value.Status.Should().Be("inactive");
        _client.Status.Should().Be(ClientStatus.Inactive);
        await _repository.Received(1).UpdateAsync(_client, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Handle_KeepsTheDataAndEveryContactOfTheClient()
    {
        var guardianIds = _client.Guardians.Select(guardian => guardian.Id).ToArray();
        var referenceContactId = _client.ReferenceContacts.Single().Id;

        var result = await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        var response = result.Value;
        response.FullName.Should().Be("Paula Rocha");
        response.Email.Should().Be("paula@example.com");
        response.Guardians.Select(guardian => guardian.Id).Should().BeEquivalentTo(guardianIds);
        response.ReferenceContacts.Should().ContainSingle().Which.Id.Should().Be(referenceContactId);
    }

    [Fact]
    public async Task Handle_AsksOnceForTheUpcomingAppointmentsOfTheClient()
    {
        await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        await _appointments.Received(1).HasUpcomingAppointmentsAsync(_client.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUpcomingAppointments_ReturnsAConflictAndKeepsTheClientActive()
    {
        _appointments.HasUpcomingAppointmentsAsync(_client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(true));

        var result = await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.HasUpcomingAppointments");
        result.Error.Message.Should().Be(
            "Não é possível desativar esta pessoa porque ela tem agendamentos futuros que não foram cancelados. Resolva esses agendamentos e tente novamente.");
        _client.Status.Should().Be(ClientStatus.Active);
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WithAnIdTheRepositoryDoesNotKnow_ReturnsNotFoundWithoutReadingAppointments()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(null));

        var result = await Handler().Handle(new DeactivateClientCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Client.NotFound");
        result.Error.Message.Should().Be("A pessoa não foi encontrada.");
        await _appointments.DidNotReceive().HasUpcomingAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WhenTheClientIsAlreadyInactive_ReturnsItsCurrentStateWithoutReadingAppointmentsOrSaving()
    {
        _client.Inactivate();

        var result = await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(_client.Id);
        result.Value.Status.Should().Be("inactive");
        result.Value.Guardians.Should().HaveCount(2);
        await _appointments.DidNotReceive().HasUpcomingAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_Email")));

        var result = await Handler().Handle(new DeactivateClientCommand(_client.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.SaveFailed");
        result.Error.FieldErrors.Should().BeNull();
    }
}
