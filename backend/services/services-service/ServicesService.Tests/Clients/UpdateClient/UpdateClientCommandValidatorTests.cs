using FluentValidation.Results;
using ServicesService.Application.Clients.UpdateClient;

namespace ServicesService.Tests.Clients.UpdateClient;

public class UpdateClientCommandValidatorTests
{
    private static readonly TimeProvider Clock = new FixedTimeProvider(new DateTimeOffset(2026, 10, 2, 15, 0, 0, TimeSpan.Zero));
    private static readonly Guid ClientId = Guid.NewGuid();
    private readonly UpdateClientCommandValidator _validator = new(Clock);

    private static UpdateClientCommand Command(
        string fullName = "Maria Souza",
        DateOnly? birthDate = null,
        string? phone = null,
        string? email = null,
        string? cpf = null,
        string? notes = null,
        IReadOnlyList<UpdateGuardianInput>? guardians = null,
        IReadOnlyList<UpdateReferenceContactInput>? referenceContacts = null,
        Guid? clientId = null) =>
        new(clientId ?? ClientId, fullName, birthDate, phone, email, cpf, notes, guardians, referenceContacts);

    private static UpdateGuardianInput Guardian(
        Guid? id = null,
        string name = "Ana Souza",
        string relationship = "Mãe",
        string? phone = null,
        string? cpf = null) =>
        new(id, name, relationship, phone, cpf);

    private static UpdateReferenceContactInput Reference(
        Guid? id = null,
        string name = "Carlos Lima",
        string relationship = "Tio",
        string? phone = null,
        params string[] purposes) =>
        new(id, name, relationship, phone, purposes.Length == 0 ? ["emergency"] : purposes);

    private async Task<ValidationResult> Validate(UpdateClientCommand command) =>
        await _validator.ValidateAsync(command);

    private static string[] MessagesFor(ValidationResult result, string propertyName) =>
        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorMessage).ToArray();

    public static TheoryData<string, UpdateClientCommand, string, string> EveryRule()
    {
        var tooManyGuardians = Enumerable.Repeat(Guardian(), 11).ToArray();
        var tooManyReferences = Enumerable.Repeat(Reference(), 11).ToArray();
        var repeatedId = Guid.NewGuid();

        return new TheoryData<string, UpdateClientCommand, string, string>
        {
            { "client id missing", Command(clientId: Guid.Empty), "ClientId", "Client.IdRequired" },
            { "name missing", Command(fullName: ""), "FullName", "FullName.Required" },
            { "name too short", Command(fullName: " A "), "FullName", "FullName.InvalidLength" },
            { "name too long", Command(fullName: new string('a', 151)), "FullName", "FullName.InvalidLength" },
            { "birth date today", Command(birthDate: new DateOnly(2026, 10, 2)), "BirthDate", "BirthDate.NotInThePast" },
            { "birth date too old", Command(birthDate: new DateOnly(1905, 10, 2)), "BirthDate", "BirthDate.TooOld" },
            { "phone", Command(phone: "telefone"), "Phone", "PhoneNumber.Invalid" },
            { "email shape", Command(email: "maria@example"), "Email", "EmailAddress.Invalid" },
            { "email length", Command(email: new string('a', 255) + "@x.com"), "Email", "EmailAddress.Invalid" },
            { "cpf", Command(cpf: "529.982.247-24"), "Cpf", "CpfNumber.Invalid" },
            { "notes", Command(notes: new string('n', 501)), "AdministrativeNotes", "AdministrativeNotes.TooLong" },
            { "minor without guardian", Command(birthDate: new DateOnly(2015, 3, 10)), "Guardians", "Client.GuardianRequired" },
            { "too many guardians", Command(guardians: tooManyGuardians), "Guardians", "Client.TooManyGuardians" },
            { "too many references", Command(referenceContacts: tooManyReferences), "ReferenceContacts", "Client.TooManyReferenceContacts" },
            { "repeated guardian id", Command(guardians: [Guardian(repeatedId), Guardian(repeatedId)]), "Guardians", "Client.DuplicateContact" },
            { "repeated reference id", Command(referenceContacts: [Reference(repeatedId), Reference(repeatedId)]), "ReferenceContacts", "Client.DuplicateContact" },
            { "null guardian", Command(guardians: [null!]), "Guardians[0]", "Client.GuardianMissing" },
            { "null reference", Command(referenceContacts: [null!]), "ReferenceContacts[0]", "Client.ReferenceContactMissing" },
            { "guardian name missing", Command(guardians: [Guardian(name: "")]), "Guardians[0].Name", "ClientContact.NameRequired" },
            { "guardian name too short", Command(guardians: [Guardian(name: "A")]), "Guardians[0].Name", "ClientContact.InvalidNameLength" },
            { "guardian relationship missing", Command(guardians: [Guardian(relationship: "")]), "Guardians[0].Relationship", "ClientContact.RelationshipRequired" },
            { "guardian relationship too long", Command(guardians: [Guardian(relationship: new string('a', 61))]), "Guardians[0].Relationship", "ClientContact.RelationshipTooLong" },
            { "guardian phone", Command(guardians: [Guardian(phone: "x")]), "Guardians[0].Phone", "PhoneNumber.Invalid" },
            { "guardian cpf", Command(guardians: [Guardian(cpf: "123")]), "Guardians[0].Cpf", "CpfNumber.Invalid" },
            { "reference name missing", Command(referenceContacts: [Reference(name: "")]), "ReferenceContacts[0].Name", "ClientContact.NameRequired" },
            { "reference relationship missing", Command(referenceContacts: [Reference(relationship: "")]), "ReferenceContacts[0].Relationship", "ClientContact.RelationshipRequired" },
            { "reference phone", Command(referenceContacts: [Reference(phone: "x")]), "ReferenceContacts[0].Phone", "PhoneNumber.Invalid" },
            { "reference without purposes", Command(referenceContacts: [new UpdateReferenceContactInput(null, "Carlos Lima", "Tio", null, [])]), "ReferenceContacts[0].Purposes", "ContactPurposes.Required" },
            { "reference unknown purpose", Command(referenceContacts: [Reference(purposes: ["billing"])]), "ReferenceContacts[0].Purposes", "ContactPurposes.Unknown" },
        };
    }

    [Fact]
    public async Task Validate_WithOnlyTheName_Passes()
    {
        var result = await Validate(Command());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEveryFieldAndExistingAndNewContacts_Passes()
    {
        var result = await Validate(Command(
            birthDate: new DateOnly(1990, 5, 20),
            phone: "+55 (11) 99999-0000",
            email: "Maria@Example.com",
            cpf: ClientTestData.ValidCpf,
            notes: "Prefere atendimento à tarde.",
            guardians:
            [
                Guardian(Guid.NewGuid(), phone: "(11) 98888-0000", cpf: ClientTestData.OtherValidCpf),
                Guardian(),
            ],
            referenceContacts:
            [
                Reference(Guid.NewGuid(), phone: "11 4000-1000", purposes: ["emergency", "dailyCommunication"]),
                Reference(),
            ]));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithNullContactLists_Passes()
    {
        var result = await Validate(Command(guardians: null, referenceContacts: null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithoutBirthDate_NeverAsksForAGuardian()
    {
        var result = await Validate(Command(birthDate: null, guardians: null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithMinorBirthDateAndAKeptGuardian_Passes()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2015, 3, 10), guardians: [Guardian(Guid.NewGuid())]));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithMinorBirthDateAndNoGuardian_ReportsOnTheGuardiansField()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2015, 3, 10), guardians: []));

        MessagesFor(result, "Guardians").Should()
            .Equal("Informe ao menos um responsável para pessoas menores de 18 anos.");
    }

    [Fact]
    public async Task Validate_UsesTheUtcDayToDecideWhoIsAMinor()
    {
        var earlyUtcMorning = new UpdateClientCommandValidator(
            new FixedTimeProvider(new DateTimeOffset(2026, 10, 3, 1, 0, 0, TimeSpan.Zero)));

        var turningEighteenToday = await earlyUtcMorning.ValidateAsync(
            Command(birthDate: new DateOnly(2008, 10, 3)),
            TestContext.Current.CancellationToken);
        var turningEighteenTomorrow = await earlyUtcMorning.ValidateAsync(
            Command(birthDate: new DateOnly(2008, 10, 4)),
            TestContext.Current.CancellationToken);

        turningEighteenToday.IsValid.Should().BeTrue();
        MessagesFor(turningEighteenTomorrow, "Guardians").Should().HaveCount(1);
    }

    [Fact]
    public async Task Validate_ReportsTheRepeatedContactOnTheListWithAMessage()
    {
        var id = Guid.NewGuid();

        var result = await Validate(Command(guardians: [Guardian(id), Guardian(id, name: "Outro Nome")]));

        MessagesFor(result, "Guardians").Should().Equal("O mesmo contato foi informado mais de uma vez.");
    }

    [Fact]
    public async Task Validate_AcceptsSeveralNewContactsWithoutIds()
    {
        var result = await Validate(Command(guardians: [Guardian(), Guardian(name: "Bia Souza")], referenceContacts: [Reference(), Reference()]));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithListsOverTheLimit_DoesNotValidateTheirItems()
    {
        var guardians = Enumerable.Range(0, 5_000).Select(_ => Guardian(name: "", relationship: "")).ToList();
        var contacts = Enumerable.Range(0, 5_000).Select(_ => new UpdateReferenceContactInput(null, "", "", "tel", [])).ToList();

        var result = await Validate(Command(guardians: guardians, referenceContacts: contacts));

        result.Errors.Select(error => error.ErrorCode)
            .Should().BeEquivalentTo(new[] { "Client.TooManyGuardians", "Client.TooManyReferenceContacts" });
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public async Task Validate_ReportsTheBusinessCodeOfEveryRule(
        string rule,
        UpdateClientCommand command,
        string propertyName,
        string expectedCode)
    {
        var result = await Validate(command);

        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorCode)
            .Should().Equal([expectedCode], rule);
    }
}
