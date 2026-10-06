using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandHandlerTests
{
    private static readonly DateTimeOffset NoonUtc = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateClientCommandHandler> _logger = Substitute.For<ILogger<CreateClientCommandHandler>>();

    public CreateClientCommandHandlerTests()
    {
        _repository.FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(null));
        _repository.FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(null));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
    }

    private CreateClientCommandHandler Handler(DateTimeOffset? utcNow = null) =>
        new(_repository, _unitOfWork, new FixedTimeProvider(utcNow ?? NoonUtc), _logger);

    private static CreateClientCommand Command(
        string fullName = "Maria Souza",
        DateOnly? birthDate = null,
        string? phone = null,
        string? email = null,
        CpfNumber? cpf = null,
        string? notes = null,
        IReadOnlyList<GuardianInput>? guardians = null,
        IReadOnlyList<ReferenceContactInput>? referenceContacts = null) =>
        new(
            ClientTestData.Name(fullName),
            ClientTestData.Birth(birthDate),
            phone is null ? null : ClientTestData.Phone(phone),
            email is null ? null : ClientTestData.Email(email),
            cpf,
            notes is null ? null : ClientTestData.Notes(notes),
            guardians,
            referenceContacts);

    private static GuardianInput Guardian() => new("Ana Souza", "Mãe", ClientTestData.Phone("(11) 98888-0000"), null);

    private static PersistenceResult<int> UniqueViolation(string? constraint) =>
        PersistenceResult.Failure<int>(new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, constraint));

    [Fact]
    public async Task Handle_WithOnlyTheName_PersistsAnActiveClientAndReturnsIt()
    {
        var result = await Handler().Handle(Command(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Id.Should().NotBe(Guid.Empty);
        response.FullName.Should().Be("Maria Souza");
        response.Status.Should().Be("active");
        response.BirthDate.Should().BeNull();
        response.Guardians.Should().BeEmpty();
        response.ReferenceContacts.Should().BeEmpty();
        _repository.Received(1).Add(Arg.Is<Client>(client => client.Id == response.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReturnsTheNormalizedDataAndEveryContact()
    {
        var command = Command(
            fullName: "  Maria Souza ",
            birthDate: new DateOnly(2015, 3, 10),
            phone: " (11) 99999-0000 ",
            email: " Maria@Example.com ",
            cpf: ClientTestData.Cpf(),
            notes: " Prefere contato por WhatsApp pela manhã. ",
            guardians: [new GuardianInput("Ana Souza", "Mãe", ClientTestData.Phone("(11) 98888-0000"), ClientTestData.Cpf(ClientTestData.OtherValidCpf))],
            referenceContacts:
            [
                new ReferenceContactInput(ClientTestData.Name(" Carlos Lima "), "Tio", ClientTestData.Phone("11 4000-1000"), ["emergency", "dailyCommunication"]),
            ]);

        var result = await Handler().Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.FullName.Should().Be("Maria Souza");
        response.BirthDate.Should().Be(new DateOnly(2015, 3, 10));
        response.Phone.Should().Be("(11) 99999-0000");
        response.Email.Should().Be("maria@example.com");
        response.Cpf.Should().Be(ClientTestData.ValidCpfDigits);
        response.AdministrativeNotes.Should().Be("Prefere contato por WhatsApp pela manhã.");
        var guardian = response.Guardians.Should().ContainSingle().Subject;
        guardian.Name.Should().Be("Ana Souza");
        guardian.Relationship.Should().Be("Mãe");
        guardian.Phone.Should().Be("(11) 98888-0000");
        guardian.Cpf.Should().Be("12345678909");
        guardian.Id.Should().NotBe(Guid.Empty);
        var reference = response.ReferenceContacts.Should().ContainSingle().Subject;
        reference.Name.Should().Be("Carlos Lima");
        reference.Phone.Should().Be("11 4000-1000");
        reference.Purposes.Should().Equal("emergency", "dailyCommunication");
    }

    [Fact]
    public async Task Handle_WithoutBirthDate_SavesWithoutAnyGuardian()
    {
        var result = await Handler().Handle(Command(birthDate: null, guardians: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_WithMinorBirthDateAndNoGuardian_FailsValidationAndDoesNotPersist()
    {
        var result = await Handler().Handle(Command(birthDate: new DateOnly(2015, 3, 10)), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Client.GuardianRequired");
        _repository.DidNotReceive().Add(Arg.Any<Client>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithMinorBirthDateAndAGuardian_Persists()
    {
        var result = await Handler().Handle(
            Command(birthDate: new DateOnly(2015, 3, 10), guardians: [Guardian()]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().ContainSingle();
    }

    [Fact]
    public async Task Handle_DecidesMinorityOnTheUtcDay()
    {
        var earlyUtcMorning = new DateTimeOffset(2026, 10, 3, 1, 0, 0, TimeSpan.Zero);

        var turningEighteenToday = await Handler(earlyUtcMorning).Handle(
            Command(birthDate: new DateOnly(2008, 10, 3)),
            CancellationToken.None);
        var turningEighteenTomorrow = await Handler(earlyUtcMorning).Handle(
            Command(birthDate: new DateOnly(2008, 10, 4)),
            CancellationToken.None);

        turningEighteenToday.IsSuccess.Should().BeTrue();
        turningEighteenTomorrow.IsFailure.Should().BeTrue();
        turningEighteenTomorrow.Error.Code.Should().Be("Client.GuardianRequired");
    }

    [Fact]
    public async Task Handle_WithInvalidContact_FailsAndDoesNotPersist()
    {
        var invalidGuardian = new GuardianInput("A", "Mãe", null, null);

        var result = await Handler().Handle(Command(guardians: [invalidGuardian]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Handle_ChecksUniquenessWithTheCpfAndTheNormalizedEmail()
    {
        await Handler().Handle(Command(email: " Maria@Example.COM ", cpf: ClientTestData.Cpf()), CancellationToken.None);

        await _repository.Received(1).FindByCpfAsync(ClientTestData.Cpf(), Arg.Any<CancellationToken>());
        await _repository.Received(1).FindActiveByEmailAsync(ClientTestData.Email(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutCpfOrEmail_SkipsTheUniquenessChecks()
    {
        await Handler().Handle(Command(), CancellationToken.None);

        await _repository.DidNotReceive().FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithCpfOfAnExistingClient_ReturnsAConflictPointingAtIt()
    {
        var existing = ClientTestData.ExistingClient();
        _repository.FindByCpfAsync(ClientTestData.Cpf(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(existing));

        var result = await Handler().Handle(Command(cpf: ClientTestData.Cpf()), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.DuplicateCpf");
        var fieldError = result.Error.FieldErrors!["Cpf"].Should().ContainSingle().Subject;
        fieldError.Code.Should().Be("Client.DuplicateCpf");
        fieldError.Message.Should().Be("Já existe uma pessoa cadastrada com este CPF.");
        fieldError.Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["clientId"] = existing.Id.ToString(),
            ["clientName"] = "Paula Rocha",
        });
        _repository.DidNotReceive().Add(Arg.Any<Client>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithEmailOfAnActiveClient_ReturnsAConflictPointingAtIt()
    {
        var existing = ClientTestData.ExistingClient();
        _repository.FindActiveByEmailAsync(ClientTestData.Email(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(existing));

        var result = await Handler().Handle(Command(email: "Maria@Example.com"), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.DuplicateEmail");
        result.Error.FieldErrors!.Keys.Should().Equal("Email");
        result.Error.FieldErrors["Email"][0].Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["clientId"] = existing.Id.ToString(),
            ["clientName"] = "Paula Rocha",
        });
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Handle_WithBothConflicts_ReportsTheCpfOnly()
    {
        _repository.FindByCpfAsync(ClientTestData.Cpf(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));
        _repository.FindActiveByEmailAsync(ClientTestData.Email(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));

        var result = await Handler().Handle(
            Command(email: "maria@example.com", cpf: ClientTestData.Cpf()),
            CancellationToken.None);

        result.Error.Code.Should().Be("Client.DuplicateCpf");
        result.Error.FieldErrors!.Keys.Should().Equal("Cpf");
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(UniqueViolation("IX_Clients_TenantId_Cpf"));

        var result = await Handler().Handle(Command(), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.SaveFailed");
        result.Error.FieldErrors.Should().BeNull();
    }
}
