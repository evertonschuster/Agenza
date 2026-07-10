using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ServicesService.IntegrationTests;

/// <summary>
/// End-to-end coverage of /api/v1/service-offerings against real Postgres,
/// mirroring TagsEndpointTests: authentication, tenant scoping, EF
/// persistence, FluentValidation through the dispatcher, and the
/// database-level unique-name-per-tenant constraint.
/// </summary>
public class ServiceOfferingsEndpointTests : IClassFixture<ServicesApiFactory>
{
    private const string ServiceOfferingsUrl = "/api/v1/service-offerings";

    private readonly ServicesApiFactory _factory;

    public ServiceOfferingsEndpointTests(ServicesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(ServiceOfferingsUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_then_list_round_trips_a_service_offering()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var createResponse = await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Haircut",
            description = "A classic cut",
            durationMinutes = 30,
            price = 45.50m,
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var serviceOfferingId = created.GetProperty("id").GetGuid();
        createResponse.Headers.Location?.ToString().Should().EndWith($"/api/v1/service-offerings/{serviceOfferingId}");
        created.GetProperty("name").GetString().Should().Be("Haircut");
        created.GetProperty("durationMinutes").GetInt32().Should().Be(30);

        var listResponse = await client.GetAsync(ServiceOfferingsUrl);
        var serviceOfferings = await listResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        serviceOfferings.Should().Contain(s => s.GetProperty("id").GetGuid() == serviceOfferingId);
    }

    [Fact]
    public async Task Create_with_an_invalid_duration_returns_a_problem_details_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Bad Duration",
            description = (string?)null,
            durationMinutes = 0,
            price = 10.00m,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_a_duplicate_name_in_the_same_tenant_returns_409()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Duplicate",
            description = (string?)null,
            durationMinutes = 30,
            price = 10.00m,
        });

        var response = await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "duplicate", // case-insensitive match
            description = (string?)null,
            durationMinutes = 45,
            price = 20.00m,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task List_only_returns_service_offerings_belonging_to_the_caller_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var clientA = AuthenticatedClient(tenantA);
        var clientB = AuthenticatedClient(tenantB);

        await clientA.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Shared Name", description = (string?)null, durationMinutes = 30, price = 10.00m,
        });
        await clientB.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Shared Name", description = (string?)null, durationMinutes = 45, price = 20.00m,
        });

        var offeringsA = await (await clientA.GetAsync(ServiceOfferingsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        var offeringsB = await (await clientB.GetAsync(ServiceOfferingsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();

        offeringsA.Should().OnlyContain(s => s.GetProperty("durationMinutes").GetInt32() == 30);
        offeringsB.Should().OnlyContain(s => s.GetProperty("durationMinutes").GetInt32() == 45);
    }

    [Fact]
    public async Task Update_from_another_tenant_returns_404_not_the_others_data()
    {
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var ownerClient = AuthenticatedClient(owner);
        var createResponse = await ownerClient.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Owner's Offering", description = (string?)null, durationMinutes = 30, price = 10.00m,
        });
        var serviceOfferingId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var intruderClient = AuthenticatedClient(intruder);
        var response = await intruderClient.PutAsJsonAsync($"{ServiceOfferingsUrl}/{serviceOfferingId}", new
        {
            name = "Hijacked", description = (string?)null, durationMinutes = 30, price = 10.00m,
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_with_valid_changes_persists_them()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Before", description = (string?)null, durationMinutes = 30, price = 10.00m,
        });
        var serviceOfferingId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var updateResponse = await client.PutAsJsonAsync($"{ServiceOfferingsUrl}/{serviceOfferingId}", new
        {
            name = "After", description = "Now with a description", durationMinutes = 60, price = 25.00m,
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("After");
        updated.GetProperty("durationMinutes").GetInt32().Should().Be(60);
    }

    [Fact]
    public async Task Delete_then_list_no_longer_contains_the_service_offering()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(ServiceOfferingsUrl, new
        {
            name = "Temporary", description = (string?)null, durationMinutes = 30, price = 10.00m,
        });
        var serviceOfferingId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var deleteResponse = await client.DeleteAsync($"{ServiceOfferingsUrl}/{serviceOfferingId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var serviceOfferings = await (await client.GetAsync(ServiceOfferingsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        serviceOfferings.Should().NotContain(s => s.GetProperty("id").GetGuid() == serviceOfferingId);
    }

    [Fact]
    public async Task Delete_with_an_unknown_id_returns_404()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.DeleteAsync($"{ServiceOfferingsUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private HttpClient AuthenticatedClient(Guid tenantId)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tenantId.ToString());
        client.DefaultRequestHeaders.Add("X-Tenant-Id", tenantId.ToString());
        return client;
    }
}
