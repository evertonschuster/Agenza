using FluentValidation.Results;
using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandValidatorTests
{
    private readonly CreateServiceCommandValidator _validator = new();

    private static CreateServiceCommand Command(
        string name = "Haircut",
        string? description = "A classic cut",
        int durationMinutes = 30,
        int minDurationMinutes = 15,
        int maxDurationMinutes = 60,
        decimal price = 45.50m,
        decimal maxDiscountPercentage = 10m,
        Guid? categoryId = null,
        IReadOnlyList<Guid>? tagIds = null) =>
        new(
            name,
            description,
            durationMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            price,
            maxDiscountPercentage,
            categoryId,
            tagIds);

    private async Task<ValidationResult> Validate(CreateServiceCommand command) =>
        await _validator.ValidateAsync(command, TestContext.Current.CancellationToken);

    private static string[] MessagesFor(ValidationResult result, string propertyName) =>
        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorMessage).ToArray();

    public static TheoryData<string, CreateServiceCommand, string, string> EveryRule()
    {
        var duplicated = Guid.NewGuid();

        return new TheoryData<string, CreateServiceCommand, string, string>
        {
            { "name missing", Command(name: ""), "Name", "Service.NameRequired" },
            { "name blank", Command(name: "   "), "Name", "Service.NameRequired" },
            { "name too long", Command(name: new string('x', Service.NameMaxLength + 1)), "Name", "Service.NameTooLong" },
            { "description too long", Command(description: new string('x', Service.DescriptionMaxLength + 1)), "Description", "Service.DescriptionTooLong" },
            { "min duration", Command(minDurationMinutes: 0), "MinDurationMinutes", "DurationRange.MinOutOfRange" },
            { "max duration", Command(maxDurationMinutes: DurationRange.MaxAllowedMinutes + 1), "MaxDurationMinutes", "DurationRange.MaxOutOfRange" },
            { "min above max", Command(minDurationMinutes: 61, maxDurationMinutes: 60, durationMinutes: 61), "MaxDurationMinutes", "DurationRange.MinGreaterThanMax" },
            { "duration below the range", Command(durationMinutes: 5), "DurationMinutes", "DurationRange.DurationOutsideRange" },
            { "duration above the range", Command(durationMinutes: 61), "DurationMinutes", "DurationRange.DurationOutsideRange" },
            { "negative price", Command(price: -0.01m), "Price", "Money.Negative" },
            { "price over the stored precision", Command(price: 123456789.12m), "Price", "Money.InvalidPrecision" },
            { "price with three decimals", Command(price: 45.123m), "Price", "Money.InvalidPrecision" },
            { "discount below zero", Command(maxDiscountPercentage: -0.01m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
            { "discount above one hundred", Command(maxDiscountPercentage: 100.01m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
            { "discount with three decimals", Command(maxDiscountPercentage: 12.345m), "MaxDiscountPercentage", "Percentage.TooManyDecimals" },
            { "too many tags", Command(tagIds: Enumerable.Range(0, Service.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray()), "TagIds", "Service.TooManyTags" },
            { "empty tag id", Command(tagIds: [Guid.Empty]), "TagIds", "Service.InvalidTag" },
            { "repeated tag id", Command(tagIds: [duplicated, duplicated]), "TagIds", "Service.DuplicateTags" },
        };
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await Validate(Command())).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_AcceptsTheLimitOfEveryRule()
    {
        var command = Command(
            name: new string('x', Service.NameMaxLength),
            description: new string('x', Service.DescriptionMaxLength),
            durationMinutes: DurationRange.MaxAllowedMinutes,
            minDurationMinutes: DurationRange.MinAllowedMinutes,
            maxDurationMinutes: DurationRange.MaxAllowedMinutes,
            price: Money.MaxValue,
            maxDiscountPercentage: Percentage.Maximum,
            tagIds: Enumerable.Range(0, Service.MaxTags).Select(_ => Guid.NewGuid()).ToArray());

        (await Validate(command)).IsValid.Should().BeTrue();
        (await Validate(Command(price: 0m, maxDiscountPercentage: 0m))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithBlankDescription_Passes(string? description)
    {
        (await Validate(Command(description: description))).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithNoTagsOrNullTags_Passes()
    {
        (await Validate(Command(tagIds: null))).IsValid.Should().BeTrue();
        (await Validate(Command(tagIds: []))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithoutName_ReportsOnlyTheRequiredMessage(string name)
    {
        var result = await Validate(Command(name: name));

        MessagesFor(result, "Name").Should().Equal("O nome do serviço é obrigatório.");
    }

    [Fact]
    public async Task Validate_CountsTheNameLengthAfterTrimming()
    {
        (await Validate(Command(name: " " + new string('x', Service.NameMaxLength) + " "))).IsValid.Should().BeTrue();

        var result = await Validate(Command(name: new string('x', Service.NameMaxLength + 1)));

        MessagesFor(result, "Name").Should().Equal("O nome do serviço deve ter no máximo 80 caracteres.");
    }

    [Fact]
    public async Task Validate_ReportsTheMessageOfEachRuleInPortuguese()
    {
        var result = await Validate(Command(
            description: new string('x', Service.DescriptionMaxLength + 1),
            minDurationMinutes: 0,
            maxDurationMinutes: DurationRange.MaxAllowedMinutes + 1,
            price: -1m,
            maxDiscountPercentage: 101m));

        MessagesFor(result, "Description").Should().Equal("A descrição do serviço deve ter no máximo 500 caracteres.");
        MessagesFor(result, "MinDurationMinutes").Should()
            .Equal("A duração mínima do serviço deve ser de pelo menos 1 minuto.");
        MessagesFor(result, "MaxDurationMinutes").Should()
            .Equal("A duração máxima do serviço não pode ultrapassar 1440 minutos.");
        MessagesFor(result, "Price").Should().Equal("O preço do serviço não pode ser negativo.");
        MessagesFor(result, "MaxDiscountPercentage").Should()
            .Equal("O desconto máximo do serviço deve ficar entre 0 e 100.");
    }

    [Fact]
    public async Task Validate_ExplainsTheCrossFieldDurationRules()
    {
        var result = await Validate(Command(durationMinutes: 5, minDurationMinutes: 61, maxDurationMinutes: 60));

        MessagesFor(result, "MaxDurationMinutes").Should()
            .Equal("A duração mínima do serviço não pode ser maior que a duração máxima.");
        MessagesFor(result, "DurationMinutes").Should()
            .Equal("A duração do serviço deve estar entre a duração mínima e a duração máxima.");
    }

    [Fact]
    public async Task Validate_ExplainsThePriceAndDiscountPrecision()
    {
        var result = await Validate(Command(price: 45.123m, maxDiscountPercentage: 12.345m));

        MessagesFor(result, "Price").Should()
            .Equal("O preço deve ter no máximo 8 dígitos inteiros e 2 casas decimais.");
        MessagesFor(result, "MaxDiscountPercentage").Should()
            .Equal("O desconto máximo deve ter no máximo 2 casas decimais.");
    }

    [Fact]
    public async Task Validate_ExplainsTheTagRules()
    {
        var duplicated = Guid.NewGuid();

        MessagesFor(
            await Validate(Command(tagIds: Enumerable.Range(0, Service.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray())),
            "TagIds").Should().Equal("Informe no máximo 10 etiquetas.");
        MessagesFor(await Validate(Command(tagIds: [Guid.Empty])), "TagIds").Should().Equal("Informe etiquetas válidas.");
        MessagesFor(await Validate(Command(tagIds: [duplicated, duplicated])), "TagIds").Should()
            .Equal("A mesma etiqueta não pode ser informada mais de uma vez.");
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public async Task Validate_ReportsTheBusinessCodeOfEveryRule(
        string rule,
        CreateServiceCommand command,
        string propertyName,
        string expectedCode)
    {
        var result = await Validate(command);

        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorCode)
            .Should().Equal([expectedCode], rule);
    }
}
