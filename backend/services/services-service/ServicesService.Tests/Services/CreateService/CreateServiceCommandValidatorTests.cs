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
        Guid? categoryId = null,
        IReadOnlyList<Guid>? tagIds = null,
        string? internalDescription = "Only for the team",
        string? clientDescription = "A classic cut",
        int durationMinutes = 30,
        int? preparationMinutes = null,
        int? cleanupMinutes = null,
        int? minDurationMinutes = null,
        int? maxDurationMinutes = null,
        string pricingType = "fixed",
        decimal? price = 45.50m,
        decimal? maxDiscountPercentage = null) =>
        new(
            name,
            categoryId,
            tagIds,
            internalDescription,
            clientDescription,
            durationMinutes,
            preparationMinutes,
            cleanupMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            pricingType,
            price,
            maxDiscountPercentage);

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
            { "internal description too long", Command(internalDescription: new string('x', Service.InternalDescriptionMaxLength + 1)), "InternalDescription", "Service.InternalDescriptionTooLong" },
            { "client description too long", Command(clientDescription: new string('x', Service.ClientDescriptionMaxLength + 1)), "ClientDescription", "Service.ClientDescriptionTooLong" },
            { "too many tags", Command(tagIds: Enumerable.Range(0, Service.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray()), "TagIds", "Service.TooManyTags" },
            { "empty tag id", Command(tagIds: [Guid.Empty]), "TagIds", "Service.InvalidTag" },
            { "repeated tag id", Command(tagIds: [duplicated, duplicated]), "TagIds", "Service.DuplicateTags" },
            { "duration zero", Command(durationMinutes: 0), "DurationMinutes", "ServiceDuration.DurationOutOfRange" },
            { "duration over a day", Command(durationMinutes: ServiceDuration.MaxAllowedMinutes + 1), "DurationMinutes", "ServiceDuration.DurationOutOfRange" },
            { "negative preparation", Command(preparationMinutes: -1), "PreparationMinutes", "ServiceDuration.PreparationOutOfRange" },
            { "preparation over a day", Command(preparationMinutes: ServiceDuration.MaxAllowedMinutes + 1), "PreparationMinutes", "ServiceDuration.PreparationOutOfRange" },
            { "negative cleanup", Command(cleanupMinutes: -1), "CleanupMinutes", "ServiceDuration.CleanupOutOfRange" },
            { "cleanup over a day", Command(cleanupMinutes: ServiceDuration.MaxAllowedMinutes + 1), "CleanupMinutes", "ServiceDuration.CleanupOutOfRange" },
            { "min duration zero", Command(minDurationMinutes: 0), "MinDurationMinutes", "ServiceDuration.MinOutOfRange" },
            { "min duration over a day", Command(minDurationMinutes: ServiceDuration.MaxAllowedMinutes + 1), "MinDurationMinutes", "ServiceDuration.MinOutOfRange" },
            { "max duration zero", Command(maxDurationMinutes: 0), "MaxDurationMinutes", "ServiceDuration.MaxOutOfRange" },
            { "max duration over a day", Command(maxDurationMinutes: ServiceDuration.MaxAllowedMinutes + 1), "MaxDurationMinutes", "ServiceDuration.MaxOutOfRange" },
            { "min above max", Command(durationMinutes: 70, minDurationMinutes: 61, maxDurationMinutes: 60), "MaxDurationMinutes", "ServiceDuration.MinGreaterThanMax" },
            { "duration below the minimum", Command(durationMinutes: 5, minDurationMinutes: 15), "DurationMinutes", "ServiceDuration.DurationBelowMin" },
            { "duration above the maximum", Command(durationMinutes: 61, maxDurationMinutes: 60), "DurationMinutes", "ServiceDuration.DurationAboveMax" },
            { "unknown pricing type", Command(pricingType: "hourly"), "PricingType", "PricingType.Unknown" },
            { "fixed price without an amount", Command(pricingType: "fixed", price: null), "Price", "Service.PriceRequired" },
            { "variable price with an amount", Command(pricingType: "variable", price: 10m), "Price", "Service.PriceNotAllowed" },
            { "negative price", Command(price: -0.01m), "Price", "Money.Negative" },
            { "price over the stored precision", Command(price: 123456789.12m), "Price", "Money.InvalidPrecision" },
            { "price with three decimals", Command(price: 45.123m), "Price", "Money.InvalidPrecision" },
            { "discount below zero", Command(maxDiscountPercentage: -0.01m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
            { "discount above one hundred", Command(maxDiscountPercentage: 100.01m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
            { "discount with three decimals", Command(maxDiscountPercentage: 12.345m), "MaxDiscountPercentage", "Percentage.TooManyDecimals" },
        };
    }

    [Fact]
    public async Task Validate_WithOnlyWhatIsRequired_Passes()
    {
        var result = await Validate(Command(
            internalDescription: null,
            clientDescription: null,
            tagIds: null,
            preparationMinutes: null,
            cleanupMinutes: null,
            minDurationMinutes: null,
            maxDurationMinutes: null,
            maxDiscountPercentage: null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEveryFieldFilled_Passes()
    {
        var result = await Validate(Command(
            categoryId: Guid.NewGuid(),
            tagIds: [Guid.NewGuid(), Guid.NewGuid()],
            durationMinutes: 30,
            preparationMinutes: 10,
            cleanupMinutes: 5,
            minDurationMinutes: 15,
            maxDurationMinutes: 60,
            maxDiscountPercentage: 10m));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_AcceptsTheLimitOfEveryRule()
    {
        var command = Command(
            name: new string('x', Service.NameMaxLength),
            internalDescription: new string('i', Service.InternalDescriptionMaxLength),
            clientDescription: new string('c', Service.ClientDescriptionMaxLength),
            tagIds: Enumerable.Range(0, Service.MaxTags).Select(_ => Guid.NewGuid()).ToArray(),
            durationMinutes: ServiceDuration.MaxAllowedMinutes,
            preparationMinutes: ServiceDuration.MaxAllowedMinutes,
            cleanupMinutes: ServiceDuration.MaxAllowedMinutes,
            minDurationMinutes: ServiceDuration.MinAllowedMinutes,
            maxDurationMinutes: ServiceDuration.MaxAllowedMinutes,
            price: Money.MaxValue,
            maxDiscountPercentage: Percentage.Maximum);

        (await Validate(command)).IsValid.Should().BeTrue();
        (await Validate(Command(durationMinutes: 1, preparationMinutes: 0, cleanupMinutes: 0))).IsValid.Should().BeTrue();
        (await Validate(Command(price: 0m, maxDiscountPercentage: 0m))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("fixed", 45.5)]
    [InlineData("Fixed", 0)]
    [InlineData("FIXED", 10)]
    public async Task Validate_WithFixedPricingAndAnAmount_Passes(string pricingType, double price)
    {
        (await Validate(Command(pricingType: pricingType, price: (decimal)price))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("variable")]
    [InlineData("Variable")]
    public async Task Validate_WithVariablePricingAndNoAmount_Passes(string pricingType)
    {
        (await Validate(Command(pricingType: pricingType, price: null))).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithADurationEqualToItsMinimumAndMaximum_Passes()
    {
        (await Validate(Command(durationMinutes: 30, minDurationMinutes: 30, maxDurationMinutes: 30))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_WithBlankDescriptions_Passes(string? description)
    {
        (await Validate(Command(internalDescription: description, clientDescription: description))).IsValid.Should().BeTrue();
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
    public async Task Validate_CountsTheTextLengthsAfterTrimming()
    {
        var padded = Command(
            name: " " + new string('x', Service.NameMaxLength) + " ",
            internalDescription: " " + new string('i', Service.InternalDescriptionMaxLength) + " ",
            clientDescription: " " + new string('c', Service.ClientDescriptionMaxLength) + " ");

        (await Validate(padded)).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_ReportsTheMessageOfEachTextRuleInPortuguese()
    {
        var result = await Validate(Command(
            name: new string('x', Service.NameMaxLength + 1),
            internalDescription: new string('x', Service.InternalDescriptionMaxLength + 1),
            clientDescription: new string('x', Service.ClientDescriptionMaxLength + 1)));

        MessagesFor(result, "Name").Should().Equal("O nome do serviço deve ter no máximo 80 caracteres.");
        MessagesFor(result, "InternalDescription").Should().Equal("A descrição interna deve ter no máximo 500 caracteres.");
        MessagesFor(result, "ClientDescription").Should().Equal("A descrição para o cliente deve ter no máximo 500 caracteres.");
    }

    [Fact]
    public async Task Validate_ReportsTheMessageOfEachTimeRuleInPortuguese()
    {
        var result = await Validate(Command(
            durationMinutes: 0,
            preparationMinutes: -1,
            cleanupMinutes: 1441,
            minDurationMinutes: 0,
            maxDurationMinutes: 1441));

        MessagesFor(result, "DurationMinutes").Should().Contain("A duração do serviço deve ser de 1 a 1440 minutos.");
        MessagesFor(result, "PreparationMinutes").Should().Equal("O tempo de preparo deve ser de 0 a 1440 minutos.");
        MessagesFor(result, "CleanupMinutes").Should().Equal("O tempo de limpeza deve ser de 0 a 1440 minutos.");
        MessagesFor(result, "MinDurationMinutes").Should().Equal("A duração mínima deve ser de 1 a 1440 minutos.");
        MessagesFor(result, "MaxDurationMinutes").Should().Equal("A duração máxima deve ser de 1 a 1440 minutos.");
    }

    [Fact]
    public async Task Validate_ExplainsTheCrossFieldDurationRules()
    {
        var limits = await Validate(Command(durationMinutes: 70, minDurationMinutes: 61, maxDurationMinutes: 60));
        var below = await Validate(Command(durationMinutes: 5, minDurationMinutes: 15));
        var above = await Validate(Command(durationMinutes: 61, maxDurationMinutes: 60));

        MessagesFor(limits, "MaxDurationMinutes").Should()
            .Equal("A duração mínima não pode ser maior que a duração máxima.");
        MessagesFor(below, "DurationMinutes").Should()
            .Equal("A duração do serviço não pode ser menor que a duração mínima.");
        MessagesFor(above, "DurationMinutes").Should()
            .Equal("A duração do serviço não pode ser maior que a duração máxima.");
    }

    [Fact]
    public async Task Validate_ExplainsThePricingRules()
    {
        MessagesFor(await Validate(Command(pricingType: "hourly")), "PricingType").Should()
            .Equal("A forma de cobrança deve ser uma das seguintes: fixed, variable.");
        MessagesFor(await Validate(Command(pricingType: "fixed", price: null)), "Price").Should()
            .Equal("Informe o valor do serviço de preço fixo.");
        MessagesFor(await Validate(Command(pricingType: "variable", price: 10m)), "Price").Should()
            .Equal("O serviço de preço variável não tem valor fixo.");
        MessagesFor(await Validate(Command(price: -1m)), "Price").Should()
            .Equal("O preço do serviço não pode ser negativo.");
        MessagesFor(await Validate(Command(price: 45.123m)), "Price").Should()
            .Equal("O preço deve ter no máximo 8 dígitos inteiros e 2 casas decimais.");
    }

    [Fact]
    public async Task Validate_ExplainsTheDiscountRules()
    {
        MessagesFor(await Validate(Command(maxDiscountPercentage: 101m)), "MaxDiscountPercentage").Should()
            .Equal("O desconto máximo do serviço deve ficar entre 0 e 100.");
        MessagesFor(await Validate(Command(maxDiscountPercentage: 12.345m)), "MaxDiscountPercentage").Should()
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

    [Fact]
    public async Task Validate_ForAnUnknownPricingType_DoesNotAlsoComplainAboutThePrice()
    {
        var result = await Validate(Command(pricingType: "hourly", price: null));

        MessagesFor(result, "Price").Should().BeEmpty();
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
