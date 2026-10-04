using System.Text.Json;
using ServicesService.Application.Services.UpdateService;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandBindingTests
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
              "pricingType": "variable"
            }
            """;

        var command = JsonSerializer.Deserialize<UpdateServiceCommand>(json, WebOptions);

        command.Should().NotBeNull();
        command!.Name.Should().Be("Haircut");
        command.PricingType.Should().Be("variable");
        typeof(UpdateServiceCommand).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant"));
    }

    [Fact]
    public void Deserialize_WithoutTheRouteId_LeavesItEmptyForTheControllerToFill()
    {
        var command = JsonSerializer.Deserialize<UpdateServiceCommand>(
            """{ "name": "Haircut", "durationMinutes": 30, "pricingType": "fixed", "price": 10 }""",
            WebOptions)!;

        command.ServiceId.Should().Be(Guid.Empty);
        (command with { ServiceId = Guid.NewGuid() }).ServiceId.Should().NotBe(Guid.Empty);
    }
}
