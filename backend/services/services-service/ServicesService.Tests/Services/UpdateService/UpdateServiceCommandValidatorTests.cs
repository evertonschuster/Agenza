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
        string? description = "A classic cut",
        int durationMinutes = 30,
        int minDurationMinutes = 15,
        int maxDurationMinutes = 60,
        decimal price = 45.50m,
        decimal maxDiscountPercentage = 10m,
        IReadOnlyList<Guid>? tagIds = null) =>
        new(
            serviceId ?? Guid.NewGuid(),
            name,
            description,
            durationMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            price,
            maxDiscountPercentage,
            null,
            tagIds);

    private async Task<ValidationResult> Validate(UpdateServiceCommand command) =>
        await _validator.ValidateAsync(command, TestContext.Current.CancellationToken);

    public static TheoryData<string, UpdateServiceCommand, string, string> EveryProperty()
    {
        return new TheoryData<string, UpdateServiceCommand, string, string>
        {
            { "id", Command(serviceId: Guid.Empty), "ServiceId", "Service.IdRequired" },
            { "name", Command(name: ""), "Name", "Service.NameRequired" },
            { "description", Command(description: new string('x', Service.DescriptionMaxLength + 1)), "Description", "Service.DescriptionTooLong" },
            { "min duration", Command(minDurationMinutes: 0), "MinDurationMinutes", "DurationRange.MinOutOfRange" },
            { "max duration", Command(maxDurationMinutes: 1441), "MaxDurationMinutes", "DurationRange.MaxOutOfRange" },
            { "duration", Command(durationMinutes: 5), "DurationMinutes", "DurationRange.DurationOutsideRange" },
            { "price", Command(price: -1m), "Price", "Money.Negative" },
            { "discount", Command(maxDiscountPercentage: 101m), "MaxDiscountPercentage", "Percentage.OutOfRange" },
            { "tags", Command(tagIds: [Guid.Empty]), "TagIds", "Service.InvalidTag" },
        };
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await Validate(Command())).IsValid.Should().BeTrue();
        (await Validate(Command(tagIds: [Guid.NewGuid(), Guid.NewGuid()]))).IsValid.Should().BeTrue();
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
