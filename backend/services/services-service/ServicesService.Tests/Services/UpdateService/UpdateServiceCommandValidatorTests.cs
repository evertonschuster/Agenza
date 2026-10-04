using FluentValidation.Results;
using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandValidatorTests
{
    private readonly UpdateServiceCommandValidator _validator = new();

    private static UpdateServiceCommand Command(
        Guid? serviceId = null,
        string name = "Haircut",
        IReadOnlyList<Guid>? tagIds = null,
        string? internalDescription = null,
        string? clientDescription = null,
        int durationMinutes = 30,
        int? preparationMinutes = null,
        int? cleanupMinutes = null,
        int? minDurationMinutes = null,
        int? maxDurationMinutes = null,
        string pricingType = "fixed",
        decimal? price = 45.50m,
        decimal? maxDiscountPercentage = null) =>
        new(
            serviceId ?? Guid.NewGuid(),
            name,
            null,
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

    private async Task<ValidationResult> Validate(UpdateServiceCommand command) =>
        await _validator.ValidateAsync(command, TestContext.Current.CancellationToken);

    public static TheoryData<string, UpdateServiceCommand, string, string> EveryProperty()
    {
        return new TheoryData<string, UpdateServiceCommand, string, string>
        {
            { "id", Command(serviceId: Guid.Empty), "ServiceId", "Service.IdRequired" },
            { "name", Command(name: ""), "Name", "Service.NameRequired" },
            { "internal description", Command(internalDescription: new string('x', Service.InternalDescriptionMaxLength + 1)), "InternalDescription", "Service.InternalDescriptionTooLong" },
            { "client description", Command(clientDescription: new string('x', Service.ClientDescriptionMaxLength + 1)), "ClientDescription", "Service.ClientDescriptionTooLong" },
            { "tags", Command(tagIds: [Guid.Empty]), "TagIds", "Service.InvalidTag" },
            { "duration", Command(durationMinutes: 0), "DurationMinutes", "ServiceDuration.DurationOutOfRange" },
            { "preparation", Command(preparationMinutes: -1), "PreparationMinutes", "ServiceDuration.PreparationOutOfRange" },
            { "cleanup", Command(cleanupMinutes: -1), "CleanupMinutes", "ServiceDuration.CleanupOutOfRange" },
            { "min duration", Command(minDurationMinutes: 0), "MinDurationMinutes", "ServiceDuration.MinOutOfRange" },
            { "max duration", Command(maxDurationMinutes: 1441), "MaxDurationMinutes", "ServiceDuration.MaxOutOfRange" },
            { "duration limits", Command(durationMinutes: 5, minDurationMinutes: 15), "DurationMinutes", "ServiceDuration.DurationBelowMin" },
            { "pricing type", Command(pricingType: "hourly"), "PricingType", "PricingType.Unknown" },
            { "price against the pricing type", Command(pricingType: "variable", price: 10m), "Price", "Service.PriceNotAllowed" },
            { "price", Command(price: -1m), "Price", "Money.Negative" },
            { "discount", Command(maxDiscountPercentage: 101m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
        };
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await Validate(Command())).IsValid.Should().BeTrue();
        (await Validate(Command(tagIds: [Guid.NewGuid(), Guid.NewGuid()]))).IsValid.Should().BeTrue();
        (await Validate(Command(pricingType: "variable", price: null))).IsValid.Should().BeTrue();
    }

    [Theory]
    [MemberData(nameof(EveryProperty))]
    public async Task Validate_AppliesTheSameRulesAsCreatingAService(
        string property,
        UpdateServiceCommand command,
        string propertyName,
        string expectedCode)
    {
        var result = await Validate(command);

        result.Errors.Where(error => error.PropertyName == propertyName).Select(error => error.ErrorCode)
            .Should().Equal([expectedCode], property);
    }

    [Fact]
    public async Task Validate_WithoutServiceId_ExplainsIt()
    {
        var result = await Validate(Command(serviceId: Guid.Empty));

        result.Errors.Single(error => error.PropertyName == "ServiceId").ErrorMessage
            .Should().Be("O id do serviço é obrigatório.");
    }
}
