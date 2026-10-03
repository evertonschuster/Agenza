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
        string? cpf = null,
        string? notes = null,
        IReadOnlyList<GuardianInput>? guardians = null,
        IReadOnlyList<ReferenceContactInput>? referenceContacts = null) =>
        new(fullName, birthDate, phone, email, cpf, notes, guardians, referenceContacts);

    private static GuardianInput Guardian(
        string name = "Ana Souza",
        string relationship = "Mãe",
        string? phone = null,
        string? cpf = null) =>
        new(name, relationship, phone, cpf);

    private static ReferenceContactInput Reference(
        string name = "Carlos Lima",
        string relationship = "Tio",
        string? phone = null,
        params string[] purposes) =>
        new(name, relationship, phone, purposes.Length == 0 ? ["emergency"] : purposes);

    private async Task<ValidationResult> Validate(CreateClientCommand command) =>
        await _validator.ValidateAsync(command);

    private static string[] MessagesFor(ValidationResult result, string propertyName) =>
        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorMessage).ToArray();

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
            cpf: ClientTestData.ValidCpf,
            notes: "Prefere atendimento à tarde.",
            guardians: [Guardian(phone: "(11) 98888-0000", cpf: ClientTestData.OtherValidCpf)],
            referenceContacts: [Reference(phone: "11 4000-1000", purposes: ["emergency", "dailyCommunication"])]));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithoutName_ReportsOnlyTheRequiredMessage(string fullName)
    {
        var result = await Validate(Command(fullName: fullName));

        MessagesFor(result, "FullName").Should().Equal("O nome completo é obrigatório.");
    }

    [Fact]
    public async Task Validate_WithOneCharacterName_ReportsTheMinimum()
    {
        var result = await Validate(Command(fullName: " A "));

        MessagesFor(result, "FullName").Should().Equal("O nome completo deve ter pelo menos 2 caracteres.");
    }

    [Fact]
    public async Task Validate_CountsTheNameLengthAfterTrimming()
    {
        (await Validate(Command(fullName: " " + new string('a', 150) + " "))).IsValid.Should().BeTrue();

        var result = await Validate(Command(fullName: new string('a', 151)));

        MessagesFor(result, "FullName").Should().Equal("O nome completo deve ter no máximo 150 caracteres.");
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

        var turningEighteenToday = await earlyUtcMorning.ValidateAsync(Command(birthDate: new DateOnly(2008, 10, 3)));
        var turningEighteenTomorrow = await earlyUtcMorning.ValidateAsync(Command(birthDate: new DateOnly(2008, 10, 4)));

        turningEighteenToday.IsValid.Should().BeTrue();
        MessagesFor(turningEighteenTomorrow, "Guardians").Should().HaveCount(1);
    }

    [Theory]
    [InlineData("telefone")]
    [InlineData("123456789012345678901")]
    [InlineData("11.99999.0000")]
    public async Task Validate_WithInvalidPhone_Fails(string phone)
    {
        var result = await Validate(Command(phone: phone));

        MessagesFor(result, "Phone").Should().ContainSingle();
    }

    [Theory]
    [InlineData("maria")]
    [InlineData("maria@example")]
    [InlineData("maria souza@example.com")]
    public async Task Validate_WithInvalidEmail_Fails(string email)
    {
        var result = await Validate(Command(email: email));

        MessagesFor(result, "Email").Should().Equal("Informe um e-mail válido.");
    }

    [Fact]
    public async Task Validate_WithEmailOverTheMaximumLength_Fails()
    {
        var result = await Validate(Command(email: new string('a', 250) + "@example.com"));

        MessagesFor(result, "Email").Should().Equal("O e-mail deve ter no máximo 254 caracteres.");
    }

    [Theory]
    [InlineData("529.982.247-24")]
    [InlineData("111.111.111-11")]
    [InlineData("1234")]
    public async Task Validate_WithInvalidCpf_Fails(string cpf)
    {
        var result = await Validate(Command(cpf: cpf));

        MessagesFor(result, "Cpf").Should().Equal("Informe um CPF válido.");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithBlankOptionalFields_Passes(string blank)
    {
        var result = await Validate(Command(phone: blank, email: blank, cpf: blank, notes: blank));

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
            Guardian(name: "A", relationship: new string('r', 61), phone: "tel", cpf: "123"),
        ]));

        MessagesFor(result, "Guardians[1].Name").Should().Equal("O nome do responsável deve ter pelo menos 2 caracteres.");
        MessagesFor(result, "Guardians[1].Relationship").Should()
            .Equal("O vínculo do responsável deve ter no máximo 60 caracteres.");
        MessagesFor(result, "Guardians[1].Phone").Should().ContainSingle();
        MessagesFor(result, "Guardians[1].Cpf").Should().Equal("Informe um CPF válido.");
        result.Errors.Should().NotContain(error => error.PropertyName.StartsWith("Guardians[0]"));
    }

    [Fact]
    public async Task Validate_ReportsReferenceContactFieldsWithTheirIndex()
    {
        var result = await Validate(Command(referenceContacts:
        [
            new ReferenceContactInput("", "", "tel", []),
            new ReferenceContactInput("Carlos Lima", "Tio", null, ["billing"]),
        ]));

        MessagesFor(result, "ReferenceContacts[0].Name").Should().Equal("O nome da pessoa de referência é obrigatório.");
        MessagesFor(result, "ReferenceContacts[0].Relationship").Should()
            .Equal("O vínculo da pessoa de referência é obrigatório.");
        MessagesFor(result, "ReferenceContacts[0].Phone").Should().ContainSingle();
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
}
