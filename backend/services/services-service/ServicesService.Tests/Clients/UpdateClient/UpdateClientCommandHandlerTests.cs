using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.UpdateClient;

namespace ServicesService.Tests.Clients.UpdateClient;

public class UpdateClientCommandHandlerTests
{
    private static readonly DateTimeOffset NoonUtc = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Client _client = ClientWithContacts();

    public UpdateClientCommandHandlerTests()
    {
        _repository.GetByIdAsync(_client.Id, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(_client));
        _repository.UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _repository.FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(null));
        _repository.FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(null));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
    }

    private UpdateClientCommandHandler Handler(DateTimeOffset? utcNow = null) =>
        new(_repository, _unitOfWork, new FixedTimeProvider(utcNow ?? NoonUtc));

    private static Client ClientWithContacts()
    {
        return Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                email: ClientTestData.Email("paula@example.com"),
                cpf: ClientTestData.Cpf(),
                guardians: [ClientTestData.Guardian("Ana Souza"), ClientTestData.Guardian("Bia Souza")],
                referenceContacts: [ClientTestData.ReferenceContact()]),
            ClientTestData.Today).Value;
    }

    private UpdateClientCommand Command(
        string fullName = "Paula Souza",
        DateOnly? birthDate = null,
        string? phone = null,
        string? email = null,
        string? cpf = null,
        string? notes = null,
        IReadOnlyList<UpdateGuardianInput>? guardians = null,
        IReadOnlyList<UpdateReferenceContactInput>? referenceContacts = null,
        Guid? clientId = null) =>
        new(
            clientId ?? _client.Id,
            ClientTestData.Name(fullName),
            ClientTestData.Birth(birthDate),
            phone is null ? null : ClientTestData.Phone(phone),
            email is null ? null : ClientTestData.Email(email),
            cpf is null ? null : ClientTestData.Cpf(cpf),
            notes is null ? null : ClientTestData.Notes(notes),
            guardians,
            referenceContacts);

    private static UpdateGuardianInput Guardian(
        string name = "Ana Souza",
        string relationship = "Mãe",
        string? phone = null,
        string? cpf = null) =>
        new(
            name,
            relationship,
            phone is null ? null : ClientTestData.Phone(phone),
            cpf is null ? null : ClientTestData.Cpf(cpf));

    private static PersistenceResult<int> UniqueViolation(string? constraint) =>
        PersistenceResult.Failure<int>(new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, constraint));

    private static void MakeInactive(Client client)
    {
        client.Inactivate();
    }

    [Fact]
    public async Task Handle_ReplacesThePersonDataAndReturnsTheNormalizedClient()
    {
        var command = Command(
            fullName: "  Paula Souza ",
            birthDate: new DateOnly(1990, 5, 20),
            phone: " (11) 99999-0000 ",
            email: " Paula.Souza@Example.com ",
            cpf: ClientTestData.OtherValidCpf,
            notes: " Prefere a tarde. ");

        var result = await Handler().Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Id.Should().Be(_client.Id);
        response.FullName.Should().Be("Paula Souza");
        response.BirthDate.Should().Be(new DateOnly(1990, 5, 20));
        response.Phone.Should().Be("(11) 99999-0000");
        response.Email.Should().Be("paula.souza@example.com");
        response.Cpf.Should().Be("12345678909");
        response.AdministrativeNotes.Should().Be("Prefere a tarde.");
        response.Status.Should().Be("active");
        await _repository.Received(1).UpdateAsync(_client, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Handle_ReplacesEveryContact()
    {
        var kept = _client.Guardians.First();
        var removed = _client.Guardians.Last();
        var contact = _client.ReferenceContacts.Single();
        var command = Command(
            guardians: [Guardian("Ana Lima"), Guardian("Cris Souza", "Tia", "(11) 98888-0000", ClientTestData.OtherValidCpf)],
            referenceContacts: [new UpdateReferenceContactInput(ClientTestData.Name("Carlos Dias"), "Primo", null, [ContactPurpose.OperationalSupport])]);

        var result = await Handler().Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Guardians.Select(guardian => guardian.Name).Should().BeEquivalentTo("Ana Lima", "Cris Souza");
        response.Guardians.Should().NotContain(guardian => guardian.Id == kept.Id || guardian.Id == removed.Id);
        var added = response.Guardians.Single(guardian => guardian.Name == "Cris Souza");
        added.Id.Should().NotBe(Guid.Empty).And.NotBe(kept.Id);
        added.Relationship.Should().Be("Tia");
        added.Phone.Should().Be("(11) 98888-0000");
        added.Cpf.Should().Be("12345678909");
        var updatedContact = response.ReferenceContacts.Should().ContainSingle().Subject;
        updatedContact.Id.Should().NotBe(contact.Id);
        updatedContact.Name.Should().Be("Carlos Dias");
        updatedContact.Purposes.Should().Equal(ContactPurpose.OperationalSupport);
    }

    [Fact]
    public async Task Handle_WithoutContactLists_RemovesEveryContact()
    {
        var result = await Handler().Handle(Command(guardians: null, referenceContacts: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().BeEmpty();
        result.Value.ReferenceContacts.Should().BeEmpty();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithAClientThatDoesNotExistForTheTenant_ReturnsNotFoundAndTouchesNothing()
    {
        var missingId = Guid.NewGuid();
        _repository.GetByIdAsync(missingId, Arg.Any<CancellationToken>()).Returns(Task.FromResult<Client?>(null));

        var result = await Handler().Handle(Command(clientId: missingId, cpf: ClientTestData.ValidCpf), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Client.NotFound");
        await _repository.DidNotReceive().FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithMinorBirthDateAndNoGuardian_FailsValidationAndDoesNotSave()
    {
        var result = await Handler().Handle(Command(birthDate: new DateOnly(2015, 3, 10)), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Client.GuardianRequired");
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithMinorBirthDateKeepingOneGuardian_Saves()
    {
        var result = await Handler().Handle(
            Command(birthDate: new DateOnly(2015, 3, 10), guardians: [Guardian()]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().ContainSingle();
    }

    [Fact]
    public async Task Handle_WithoutBirthDate_SavesWithoutAnyGuardian()
    {
        var result = await Handler().Handle(Command(birthDate: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Guardians.Should().BeEmpty();
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
        turningEighteenTomorrow.Error.Code.Should().Be("Client.GuardianRequired");
    }

    [Fact]
    public async Task Handle_WithInvalidContactData_FailsAndDoesNotSave()
    {
        var result = await Handler().Handle(
            Command(guardians: [new UpdateGuardianInput("A", "Mãe", null, null)]),
            CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("ClientContact.InvalidNameLength");
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ChecksUniquenessWithTheNormalizedValuesExcludingTheClientItself()
    {
        await Handler().Handle(
            Command(email: " Paula@Example.COM ", cpf: ClientTestData.ValidCpf),
            CancellationToken.None);

        await _repository.Received(1).FindByCpfAsync(ClientTestData.Cpf(), _client.Id, Arg.Any<CancellationToken>());
        await _repository.Received(1).FindActiveByEmailAsync(
            ClientTestData.Email("paula@example.com"),
            _client.Id,
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutCpfOrEmail_SkipsTheUniquenessChecks()
    {
        await Handler().Handle(Command(), CancellationToken.None);

        await _repository.DidNotReceive().FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithCpfOfAnotherClient_ReturnsAConflictPointingAtIt()
    {
        var other = ClientTestData.ExistingClient();
        _repository.FindByCpfAsync(ClientTestData.Cpf(), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(other));

        var result = await Handler().Handle(Command(cpf: ClientTestData.ValidCpf), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.DuplicateCpf");
        var fieldError = result.Error.FieldErrors!["Cpf"].Should().ContainSingle().Subject;
        fieldError.Message.Should().Be("Já existe uma pessoa cadastrada com este CPF.");
        fieldError.Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["clientId"] = other.Id.ToString(),
            ["clientName"] = "Paula Rocha",
        });
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithEmailOfAnotherActiveClient_ReturnsAConflictPointingAtIt()
    {
        var other = ClientTestData.ExistingClient();
        _repository.FindActiveByEmailAsync(ClientTestData.Email("maria@example.com"), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(other));

        var result = await Handler().Handle(Command(email: "Maria@Example.com"), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Client.DuplicateEmail");
        result.Error.FieldErrors!.Keys.Should().Equal("Email");
        result.Error.FieldErrors["Email"][0].Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["clientId"] = other.Id.ToString(),
            ["clientName"] = "Paula Rocha",
        });
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithBothConflicts_ReportsTheCpfOnly()
    {
        _repository.FindByCpfAsync(ClientTestData.Cpf(), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));
        _repository.FindActiveByEmailAsync(ClientTestData.Email("maria@example.com"), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));

        var result = await Handler().Handle(
            Command(email: "maria@example.com", cpf: ClientTestData.ValidCpf),
            CancellationToken.None);

        result.Error.Code.Should().Be("Client.DuplicateCpf");
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ForAnInactiveClient_StillChecksTheCpf()
    {
        MakeInactive(_client);
        _repository.FindByCpfAsync(ClientTestData.Cpf(), _client.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));

        var result = await Handler().Handle(Command(cpf: ClientTestData.ValidCpf), CancellationToken.None);

        result.Error.Code.Should().Be("Client.DuplicateCpf");
    }

    [Fact]
    public async Task Handle_ForAnInactiveClient_SkipsTheEmailCheckAndKeepsTheSituation()
    {
        MakeInactive(_client);
        _repository.FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Client?>(ClientTestData.ExistingClient()));

        var result = await Handler().Handle(Command(email: "maria@example.com"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be("inactive");
        result.Value.Email.Should().Be("maria@example.com");
        await _repository.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
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
