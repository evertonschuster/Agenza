using Admin.SharedKernel.ValueObjects;
using FluentValidation.Results;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandValidatorTests
{
    private static readonly TimeProvider Clock = new FixedTimeProvider(new DateTimeOffset(2026, 10, 2, 15, 0, 0, TimeSpan.Zero));
    private readonly CreateClientCommandValidator _validator = new(Clock);

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
            birthDate,
            phone is null ? null : ClientTestData.Phone(phone),
            email is null ? null : ClientTestData.Email(email),
            cpf,
            notes,
            guardians,
            referenceContacts);

    private static GuardianInput Guardian(
        string name = "Ana Souza",
        string relationship = "Mãe",
        string? phone = null,
        CpfNumber? cpf = null) =>
        new(name, relationship, phone is null ? null : ClientTestData.Phone(phone), cpf);

    private static ReferenceContactInput Reference(
        string name = "Carlos Lima",
        string relationship = "Tio",
        string? phone = null,
        params string[] purposes) =>
        new(name, relationship, phone is null ? null : ClientTestData.Phone(phone), purposes.Length == 0 ? ["emergency"] : purposes);

    private async Task<ValidationResult> Validate(CreateClientCommand command) =>
        await _validator.ValidateAsync(command);

    private static string[] MessagesFor(ValidationResult result, string propertyName) =>
        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorMessage).ToArray();

    public static TheoryData<string, CreateClientCommand, string, string> EveryRule()
    {
        var tooManyGuardians = Enumerable.Repeat(Guardian(), 11).ToArray();
        var tooManyReferences = Enumerable.Repeat(Reference(), 11).ToArray();

        return new TheoryData<string, CreateClientCommand, string, string>
        {
            { "birth date today", Command(birthDate: new DateOnly(2026, 10, 2)), "BirthDate", "BirthDate.NotInThePast" },
            { "birth date too old", Command(birthDate: new DateOnly(1905, 10, 2)), "BirthDate", "BirthDate.TooOld" },
            { "notes", Command(notes: new string('n', 501)), "AdministrativeNotes", "AdministrativeNotes.TooLong" },
            { "minor without guardian", Command(birthDate: new DateOnly(2015, 3, 10)), "Guardians", "Client.GuardianRequired" },
            { "too many guardians", Command(guardians: tooManyGuardians), "Guardians", "Client.TooManyGuardians" },
            { "too many references", Command(referenceContacts: tooManyReferences), "ReferenceContacts", "Client.TooManyReferenceContacts" },
            { "null guardian", Command(guardians: [null!]), "Guardians[0]", "Client.GuardianMissing" },
            { "null reference", Command(referenceContacts: [null!]), "ReferenceContacts[0]", "Client.ReferenceContactMissing" },
            { "guardian name missing", Command(guardians: [Guardian(name: "")]), "Guardians[0].Name", "ClientContact.NameRequired" },
            { "guardian name too short", Command(guardians: [Guardian(name: "A")]), "Guardians[0].Name", "ClientContact.InvalidNameLength" },
            { "guardian relationship missing", Command(guardians: [Guardian(relationship: "")]), "Guardians[0].Relationship", "ClientContact.RelationshipRequired" },
            { "guardian relationship too long", Command(guardians: [Guardian(relationship: new string('a', 61))]), "Guardians[0].Relationship", "ClientContact.RelationshipTooLong" },
            { "reference without purposes", Command(referenceContacts: [new ReferenceContactInput("Carlos Lima", "Tio", null, [])]), "ReferenceContacts[0].Purposes", "ContactPurposes.Required" },
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
    public async Task Validate_WithEveryFieldFilled_Passes()
    {
        var result = await Validate(Command(
            birthDate: new DateOnly(1990, 5, 20),
            phone: "+55 (11) 99999-0000",
            email: "Maria@Example.com",
            cpf: ClientTestData.Cpf(),
            notes: "Prefere atendimento à tarde.",
            guardians: [Guardian(phone: "(11) 98888-0000", cpf: ClientTestData.Cpf(ClientTestData.OtherValidCpf))],
            referenceContacts: [Reference(phone: "11 4000-1000", purposes: ["emergency", "dailyCommunication"])]));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithBirthDateToday_Fails()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2026, 10, 2), guardians: [Guardian()]));

        MessagesFor(result, "BirthDate").Should().Equal("A data de nascimento deve estar no passado.");
    }

    [Fact]
    public async Task Validate_WithFutureBirthDate_FailsWithoutDemandingAGuardian()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2027, 1, 1)));

        MessagesFor(result, "BirthDate").Should().Equal("A data de nascimento deve estar no passado.");
        MessagesFor(result, "Guardians").Should().BeEmpty();
    }

    [Fact]
    public async Task Validate_WithBirthDateOlderThanOneHundredTwentyYears_Fails()
    {
        (await Validate(Command(birthDate: new DateOnly(1906, 10, 2)))).IsValid.Should().BeTrue();

        var result = await Validate(Command(birthDate: new DateOnly(1905, 10, 2)));

        MessagesFor(result, "BirthDate").Should()
            .Equal("A data de nascimento não pode indicar idade superior a 120 anos.");
    }

    [Fact]
    public async Task Validate_WithoutBirthDate_NeverAsksForAGuardian()
    {
        var result = await Validate(Command(birthDate: null, guardians: null));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Validate_WithMinorBirthDateAndNoGuardian_ReportsOnTheGuardiansField(bool emptyList)
    {
        var guardians = emptyList ? Array.Empty<GuardianInput>() : null;

        var result = await Validate(Command(birthDate: new DateOnly(2015, 3, 10), guardians: guardians));

        MessagesFor(result, "Guardians").Should()
            .Equal("Informe ao menos um responsável para pessoas menores de 18 anos.");
    }

    [Fact]
    public async Task Validate_WithMinorBirthDateAndAValidGuardian_Passes()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2015, 3, 10), guardians: [Guardian()]));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithMinorBirthDateAndAnInvalidGuardian_ReportsTheGuardianFields()
    {
        var result = await Validate(Command(birthDate: new DateOnly(2015, 3, 10), guardians: [Guardian(name: "", relationship: "")]));

        MessagesFor(result, "Guardians[0].Name").Should().Equal("O nome do responsável é obrigatório.");
        MessagesFor(result, "Guardians[0].Relationship").Should().Equal("O vínculo do responsável é obrigatório.");
        MessagesFor(result, "Guardians").Should().BeEmpty();
    }

    [Fact]
    public async Task Validate_WithNullContactItems_ReportsEachItem()
    {
        var result = await Validate(Command(
            birthDate: new DateOnly(2015, 3, 10),
            guardians: [null!],
            referenceContacts: [Reference(), null!]));

        MessagesFor(result, "Guardians[0]").Should().Equal("Informe os dados do responsável.");
        MessagesFor(result, "ReferenceContacts[1]").Should().Equal("Informe os dados da pessoa de referência.");
        MessagesFor(result, "ReferenceContacts[0]").Should().BeEmpty();
    }

    [Fact]
    public async Task Validate_UsesTheUtcDayToDecideWhoIsAMinor()
    {
        var earlyUtcMorning = new CreateClientCommandValidator(
            new FixedTimeProvider(new DateTimeOffset(2026, 10, 3, 1, 0, 0, TimeSpan.Zero)));

        var turningEighteenToday = await earlyUtcMorning.ValidateAsync(Command(birthDate: new DateOnly(2008, 10, 3)), TestContext.Current.CancellationToken);
        var turningEighteenTomorrow = await earlyUtcMorning.ValidateAsync(Command(birthDate: new DateOnly(2008, 10, 4)), TestContext.Current.CancellationToken);

        turningEighteenToday.IsValid.Should().BeTrue();
        MessagesFor(turningEighteenTomorrow, "Guardians").Should().HaveCount(1);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithBlankAdministrativeNotes_Passes(string blank)
    {
        var result = await Validate(Command(notes: blank));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_LimitsAdministrativeNotesToFiveHundredCharacters()
    {
        (await Validate(Command(notes: new string('n', 500)))).IsValid.Should().BeTrue();

        var result = await Validate(Command(notes: new string('n', 501)));

        MessagesFor(result, "AdministrativeNotes").Should()
            .Equal("As observações administrativas devem ter no máximo 500 caracteres.");
    }

    [Fact]
    public async Task Validate_ReportsGuardianFieldsWithTheirIndex()
    {
        var result = await Validate(Command(guardians:
        [
            Guardian(),
            Guardian(name: "A", relationship: new string('r', 61)),
        ]));

        MessagesFor(result, "Guardians[1].Name").Should().Equal("O nome do responsável deve ter pelo menos 2 caracteres.");
        MessagesFor(result, "Guardians[1].Relationship").Should()
            .Equal("O vínculo do responsável deve ter no máximo 60 caracteres.");
        result.Errors.Should().NotContain(error => error.PropertyName.StartsWith("Guardians[0]"));
    }

    [Fact]
    public async Task Validate_ReportsReferenceContactFieldsWithTheirIndex()
    {
        var result = await Validate(Command(referenceContacts:
        [
            new ReferenceContactInput("", "", null, []),
            new ReferenceContactInput("Carlos Lima", "Tio", null, ["billing"]),
        ]));

        MessagesFor(result, "ReferenceContacts[0].Name").Should().Equal("O nome da pessoa de referência é obrigatório.");
        MessagesFor(result, "ReferenceContacts[0].Relationship").Should()
            .Equal("O vínculo da pessoa de referência é obrigatório.");
        MessagesFor(result, "ReferenceContacts[0].Purposes").Should()
            .Equal("Informe ao menos uma finalidade para a pessoa de referência.");
        MessagesFor(result, "ReferenceContacts[1].Purposes").Should().ContainSingle()
            .Which.Should().Contain("emergency");
    }

    [Fact]
    public async Task Validate_AcceptsEveryAllowedPurposeCombination()
    {
        var result = await Validate(Command(referenceContacts:
        [
            Reference(purposes: ["emergency"]),
            Reference(purposes: ["operationalSupport", "dailyCommunication"]),
            Reference(purposes: ["emergency", "operationalSupport", "dailyCommunication"]),
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
    public async Task Validate_LimitsTheNumberOfContacts()
    {
        var guardians = Enumerable.Range(0, 11).Select(_ => Guardian()).ToList();
        var contacts = Enumerable.Range(0, 11).Select(_ => Reference()).ToList();

        var result = await Validate(Command(guardians: guardians, referenceContacts: contacts));

        MessagesFor(result, "Guardians").Should().Equal("Informe no máximo 10 responsáveis.");
        MessagesFor(result, "ReferenceContacts").Should().Equal("Informe no máximo 10 pessoas de referência.");
    }

    [Fact]
    public async Task Validate_WithListsOverTheLimit_DoesNotValidateTheirItems()
    {
        var guardians = Enumerable.Range(0, 5_000).Select(_ => Guardian(name: "", relationship: "")).ToList();
        var contacts = Enumerable.Range(0, 5_000).Select(_ => new ReferenceContactInput("", "", null, [])).ToList();

        var result = await Validate(Command(guardians: guardians, referenceContacts: contacts));

        result.Errors.Select(error => error.ErrorCode)
            .Should().BeEquivalentTo(new[] { "Client.TooManyGuardians", "Client.TooManyReferenceContacts" });
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public async Task Validate_ReportsTheBusinessCodeOfEveryRule(
        string rule,
        CreateClientCommand command,
        string propertyName,
        string expectedCode)
    {
        var result = await Validate(command);

        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorCode)
            .Should().Equal([expectedCode], rule);
    }
}
