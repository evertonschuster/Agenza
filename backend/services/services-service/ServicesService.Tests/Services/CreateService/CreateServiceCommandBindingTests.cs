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
              "minDurationMinutes": 15,
              "maxDurationMinutes": 60,
              "price": 45.5,
              "maxDiscountPercentage": 10
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
              "description": "A classic cut",
              "durationMinutes": 30,
              "minDurationMinutes": 15,
              "maxDurationMinutes": 60,
              "price": 45.5,
              "maxDiscountPercentage": 10,
              "categoryId": "{{categoryId}}",
              "tagIds": ["{{tagId}}"]
            }
            """;

        var command = JsonSerializer.Deserialize<CreateServiceCommand>(json, WebOptions)!;

        command.Description.Should().Be("A classic cut");
        command.DurationMinutes.Should().Be(30);
        command.MinDurationMinutes.Should().Be(15);
        command.MaxDurationMinutes.Should().Be(60);
        command.Price.Should().Be(45.5m);
        command.MaxDiscountPercentage.Should().Be(10m);
        command.CategoryId.Should().Be(categoryId);
        command.TagIds.Should().Equal(tagId);
    }

    [Fact]
    public void Deserialize_WithoutOptionalFields_LeavesThemNull()
    {
        var command = JsonSerializer.Deserialize<CreateServiceCommand>("""{ "name": "Haircut" }""", WebOptions)!;

        command.Description.Should().BeNull();
        command.CategoryId.Should().BeNull();
        command.TagIds.Should().BeNull();
    }
}
