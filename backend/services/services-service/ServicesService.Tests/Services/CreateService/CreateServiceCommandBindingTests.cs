using System.Text.Json;
using ServicesService.Application.Services.CreateService;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandBindingTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Deserialize_IgnoresATenantSentInTheBody()
    {
        const string json = """
            {
              "tenantId": "11111111-1111-1111-1111-111111111111",
              "name": "Haircut",
              "durationMinutes": 30,
              "pricingType": "fixed",
              "price": 45.5
            }
            """;

        var command = JsonSerializer.Deserialize<CreateServiceCommand>(json, WebOptions);

        command.Should().NotBeNull();
        command!.Name.Should().Be("Haircut");
        typeof(CreateServiceCommand).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant"));
    }

    [Fact]
    public void Deserialize_ReadsTheWireContract()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var json = $$"""
            {
              "name": "Haircut",
              "categoryId": "{{categoryId}}",
              "tagIds": ["{{tagId}}"],
              "internalDescription": "Only for the team",
              "clientDescription": "A classic cut",
              "durationMinutes": 30,
              "preparationMinutes": 10,
              "cleanupMinutes": 5,
              "minDurationMinutes": 15,
              "maxDurationMinutes": 60,
              "pricingType": "fixed",
              "price": 45.5,
              "maxDiscountPercentage": 10
            }
            """;

        var command = JsonSerializer.Deserialize<CreateServiceCommand>(json, WebOptions)!;

        command.CategoryId.Should().Be(categoryId);
        command.TagIds.Should().Equal(tagId);
        command.InternalDescription.Should().Be("Only for the team");
        command.ClientDescription.Should().Be("A classic cut");
        command.DurationMinutes.Should().Be(30);
        command.PreparationMinutes.Should().Be(10);
        command.CleanupMinutes.Should().Be(5);
        command.MinDurationMinutes.Should().Be(15);
        command.MaxDurationMinutes.Should().Be(60);
        command.PricingType.Should().Be("fixed");
        command.Price.Should().Be(45.5m);
        command.MaxDiscountPercentage.Should().Be(10m);
    }

    [Fact]
    public void Deserialize_ReadsAVariablePricedServiceWithoutAnAmount()
    {
        const string json = """{ "name": "Session", "durationMinutes": 50, "pricingType": "variable", "price": null }""";

        var command = JsonSerializer.Deserialize<CreateServiceCommand>(json, WebOptions)!;

        command.PricingType.Should().Be("variable");
        command.Price.Should().BeNull();
    }

    [Fact]
    public void Deserialize_WithoutOptionalFields_LeavesThemNull()
    {
        var command = JsonSerializer.Deserialize<CreateServiceCommand>(
            """{ "name": "Haircut", "durationMinutes": 30, "pricingType": "fixed", "price": 10 }""",
            WebOptions)!;

        command.CategoryId.Should().BeNull();
        command.TagIds.Should().BeNull();
        command.InternalDescription.Should().BeNull();
        command.ClientDescription.Should().BeNull();
        command.PreparationMinutes.Should().BeNull();
        command.CleanupMinutes.Should().BeNull();
        command.MinDurationMinutes.Should().BeNull();
        command.MaxDurationMinutes.Should().BeNull();
        command.MaxDiscountPercentage.Should().BeNull();
    }
}
