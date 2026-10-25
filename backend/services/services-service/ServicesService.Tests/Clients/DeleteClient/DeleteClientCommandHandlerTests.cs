using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.DeleteClient;

namespace ServicesService.Tests.Clients.DeleteClient;

public class DeleteClientCommandHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Client _client = ClientWithContacts();

    public DeleteClientCommandHandlerTests()
    {
        _repository.GetByIdAsync(_client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(_client));
        _appointments.HasAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(false));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
    }

    private DeleteClientCommandHandler Handler() => new(_repository, _appointments, _unitOfWork);

    private static Client ClientWithContacts()
    {
        return Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                email: ClientTestData.Email("paula@example.com"),
                guardians: [ClientTestData.Guardian("Ana Souza")],
                referenceContacts: [ClientTestData.ReferenceContact()]),
            ClientTestData.Today).Value;
    }

    private async Task AssertNothingWasPersisted()
    {
        _repository.DidNotReceive().Remove(Arg.Any<Client>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNoAppointment_RemovesTheClientAndSaves()
    {
        var result = await Handler().Handle(new DeleteClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _repository.Received(1).Remove(_client);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithAnInactiveClient_RemovesItToo()
    {
        _client.Inactivate();

        var result = await Handler().Handle(new DeleteClientCommand(_client.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _repository.Received(1).Remove(_client);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_AsksOnceForTheAppointmentsOfTheClient()
    {
        await Handler().Handle(new DeleteClientCommand(_client.Id), CancellationToken.None);

        await _appointments.Received(1).HasAppointmentsAsync(_client.Id, Arg.Any<CancellationToken>());
        await _appointments.DidNotReceive().HasUpcomingAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithAppointments_ReturnsAConflictAndKeepsTheClient()
    {
        _appointments.HasAppointmentsAsync(_client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(true));

        var result = await Handler().Handle(new DeleteClientCommand(_client.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.HasAppointments");
        result.Error.Message.Should().Be(
            "Não é possível excluir esta pessoa porque ela tem agendamentos registrados, inclusive passados ou cancelados. Se ela não for mais atendida, desative o cadastro.");
        result.Error.FieldErrors.Should().BeNull();
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WithAnIdTheRepositoryDoesNotKnow_ReturnsNotFoundWithoutReadingAppointments()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(null));

        var result = await Handler().Handle(new DeleteClientCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Client.NotFound");
        result.Error.Message.Should().Be("A pessoa não foi encontrada.");
        await _appointments.DidNotReceive().HasAppointmentsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await AssertNothingWasPersisted();
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_Cpf")));

        var result = await Handler().Handle(new DeleteClientCommand(_client.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.SaveFailed");
        result.Error.Message.Should().Be("Não foi possível salvar a pessoa. Tente novamente.");
        result.Error.FieldErrors.Should().BeNull();
    }
}
