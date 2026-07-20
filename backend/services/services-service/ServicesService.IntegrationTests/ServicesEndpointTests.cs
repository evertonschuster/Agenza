using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ServicesService.IntegrationTests;

/// <summary>
/// End-to-end coverage of /api/v1/services against real Postgres,
/// mirroring TagsEndpointTests: authentication, tenant scoping, EF
/// persistence, FluentValidation through the dispatcher, the
/// database-level unique-name-per-tenant constraint, and the new
/// category/tag/code behavior.
/// </summary>
public class ServicesEndpointTests : IClassFixture<ServicesApiFactory>
{
    private const string ServicesUrl = "/api/v1/services";
    private const string CategoriesUrl = "/api/v1/categories";
    private const string TagsUrl = "/api/v1/tags";

    private readonly ServicesApiFactory _factory;

    public ServicesEndpointTests(ServicesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(ServicesUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_then_list_round_trips_a_service()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var createResponse = await client.PostAsJsonAsync(ServicesUrl, new
        {
            name = "Haircut",
            description = "A classic cut",
            durationMinutes = 30,
            minDurationMinutes = 15,
            maxDurationMinutes = 60,
            price = 45.50m,
            maxDiscountPercentage = 10m,
            categoryId = (Guid?)null,
            tagIds = (Guid[]?)null,
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var serviceId = created.GetProperty("id").GetGuid();
        createResponse.Headers.Location?.ToString().Should().EndWith($"/api/v1/services/{serviceId}");
        created.GetProperty("name").GetString().Should().Be("Haircut");
        created.GetProperty("durationMinutes").GetInt32().Should().Be(30);
        created.GetProperty("minDurationMinutes").GetInt32().Should().Be(15);
        created.GetProperty("maxDurationMinutes").GetInt32().Should().Be(60);
        created.GetProperty("code").GetInt32().Should().BeGreaterThan(0);

        var listResponse = await client.GetAsync(ServicesUrl);
        var services = await ReadItemsAsync(listResponse);
        services.Should().Contain(s => s.GetProperty("id").GetGuid() == serviceId);
    }

    [Fact]
    public async Task Create_assigns_sequential_codes_per_tenant()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var firstResponse = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("First"));
        var secondResponse = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Second"));

        var firstCode = (await firstResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetInt32();
        var secondCode = (await secondResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetInt32();

        secondCode.Should().Be(firstCode + 1);
    }

    [Fact]
    public async Task Create_with_an_invalid_duration_returns_a_problem_details_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(ServicesUrl, new
        {
            name = "Bad Duration",
            description = (string?)null,
            durationMinutes = 5,
            minDurationMinutes = 15,
            maxDurationMinutes = 60,
            price = 10.00m,
            maxDiscountPercentage = 10m,
            categoryId = (Guid?)null,
            tagIds = (Guid[]?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_an_unknown_category_returns_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Uncategorized", categoryId: Guid.NewGuid()));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_tags_returns_them_in_the_response()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var tagResponse = await client.PostAsJsonAsync(TagsUrl, new { name = "VIP", color = "#0d9488", description = (string?)null });
        var tagId = (await tagResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var response = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Tagged", tagIds: [tagId]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("tags").EnumerateArray().Should().ContainSingle(t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Create_with_a_duplicate_name_in_the_same_tenant_returns_400()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Duplicate"));

        var response = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("duplicate")); // case-insensitive match

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task List_only_returns_services_belonging_to_the_caller_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var clientA = AuthenticatedClient(tenantA);
        var clientB = AuthenticatedClient(tenantB);

        await clientA.PostAsJsonAsync(ServicesUrl, NewServiceBody("Shared Name", durationMinutes: 30));
        await clientB.PostAsJsonAsync(ServicesUrl, NewServiceBody("Shared Name", durationMinutes: 45));

        var servicesA = await ReadItemsAsync(await clientA.GetAsync(ServicesUrl));
        var servicesB = await ReadItemsAsync(await clientB.GetAsync(ServicesUrl));

        servicesA.Should().OnlyContain(s => s.GetProperty("durationMinutes").GetInt32() == 30);
        servicesB.Should().OnlyContain(s => s.GetProperty("durationMinutes").GetInt32() == 45);
    }

    [Fact]
    public async Task Update_from_another_tenant_returns_400_not_the_others_data()
    {
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var ownerClient = AuthenticatedClient(owner);
        var createResponse = await ownerClient.PostAsJsonAsync(ServicesUrl, NewServiceBody("Owner's Service"));
        var serviceId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var intruderClient = AuthenticatedClient(intruder);
        var response = await intruderClient.PutAsJsonAsync($"{ServicesUrl}/{serviceId}", NewServiceBody("Hijacked"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_with_valid_changes_persists_them()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Before"));
        var serviceId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var updateResponse = await client.PutAsJsonAsync($"{ServicesUrl}/{serviceId}", new
        {
            name = "After",
            description = "Now with a description",
            durationMinutes = 90,
            minDurationMinutes = 60,
            maxDurationMinutes = 120,
            price = 25.00m,
            maxDiscountPercentage = 20m,
            categoryId = (Guid?)null,
            tagIds = (Guid[]?)null,
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("After");
        updated.GetProperty("durationMinutes").GetInt32().Should().Be(90);
        updated.GetProperty("minDurationMinutes").GetInt32().Should().Be(60);
        updated.GetProperty("maxDurationMinutes").GetInt32().Should().Be(120);
    }

    [Fact]
    public async Task Delete_then_list_no_longer_contains_the_service()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Temporary"));
        var serviceId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var deleteResponse = await client.DeleteAsync($"{ServicesUrl}/{serviceId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var services = await ReadItemsAsync(await client.GetAsync(ServicesUrl));
        services.Should().NotContain(s => s.GetProperty("id").GetGuid() == serviceId);
    }

    [Fact]
    public async Task Delete_with_an_unknown_id_returns_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.DeleteAsync($"{ServicesUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task List_with_a_page_size_smaller_than_the_total_returns_the_requested_page_and_total_count()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Alpha"));
        await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Bravo"));
        await client.PostAsJsonAsync(ServicesUrl, NewServiceBody("Charlie"));

        var response = await client.GetAsync($"{ServicesUrl}?page=1&pageSize=2");
        var envelope = await response.Content.ReadFromJsonAsync<JsonElement>();

        envelope.GetProperty("items").GetArrayLength().Should().Be(2);
        envelope.GetProperty("totalCount").GetInt32().Should().Be(3);
        envelope.GetProperty("page").GetInt32().Should().Be(1);
        envelope.GetProperty("pageSize").GetInt32().Should().Be(2);
    }

    private static async Task<JsonElement[]> ReadItemsAsync(HttpResponseMessage response)
    {
        var envelope = await response.Content.ReadFromJsonAsync<JsonElement>();
        return envelope.GetProperty("items").EnumerateArray().ToArray();
    }

    private static object NewServiceBody(
        string name, int durationMinutes = 30, Guid? categoryId = null, Guid[]? tagIds = null) => new
    {
        name,
        description = (string?)null,
        durationMinutes,
        minDurationMinutes = 15,
        maxDurationMinutes = 60,
        price = 10.00m,
        maxDiscountPercentage = 10m,
        categoryId,
        tagIds,
    };

    private HttpClient AuthenticatedClient(Guid tenantId)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tenantId.ToString());
        client.DefaultRequestHeaders.Add("X-Tenant-Id", tenantId.ToString());
        return client;
    }
}
