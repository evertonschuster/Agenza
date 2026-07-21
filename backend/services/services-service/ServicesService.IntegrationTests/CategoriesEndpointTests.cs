using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ServicesService.IntegrationTests;

public class CategoriesEndpointTests : IClassFixture<ServicesApiFactory>
{
    private const string CategoriesUrl = "/api/v1/categories";

    private readonly ServicesApiFactory _factory;

    public CategoriesEndpointTests(ServicesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(CategoriesUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task List_with_an_M2M_token_that_has_no_tenant_is_forbidden()
    {
        var client = AuthenticatedClient("M2M");

        var response = await client.GetAsync(CategoriesUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_then_list_round_trips_a_category()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var createResponse = await client.PostAsJsonAsync(CategoriesUrl, new { name = "Hair" });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var categoryId = created.GetProperty("id").GetGuid();
        createResponse.Headers.Location?.ToString().Should().EndWith($"/api/v1/categories/{categoryId}");
        created.GetProperty("name").GetString().Should().Be("Hair");

        var listResponse = await client.GetAsync(CategoriesUrl);
        var categories = await listResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        categories.Should().Contain(c => c.GetProperty("id").GetGuid() == categoryId);
    }

    [Fact]
    public async Task Create_with_an_empty_name_is_rejected_by_validation_before_the_handler_runs()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(CategoriesUrl, new { name = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_a_duplicate_name_in_the_same_tenant_returns_400()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync(CategoriesUrl, new { name = "Duplicate" });

        var response = await client.PostAsJsonAsync(CategoriesUrl, new { name = "duplicate" }); // case-insensitive match

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task List_only_returns_categories_belonging_to_the_caller_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var clientA = AuthenticatedClient(tenantA);
        var clientB = AuthenticatedClient(tenantB);

        await clientA.PostAsJsonAsync(CategoriesUrl, new { name = "Shared Name" });
        await clientB.PostAsJsonAsync(CategoriesUrl, new { name = "Shared Name" });

        var categoriesA = await (await clientA.GetAsync(CategoriesUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        var categoriesB = await (await clientB.GetAsync(CategoriesUrl)).Content.ReadFromJsonAsync<JsonElement[]>();

        categoriesA.Should().ContainSingle(c => c.GetProperty("name").GetString() == "Shared Name");
        categoriesB.Should().ContainSingle(c => c.GetProperty("name").GetString() == "Shared Name");
    }

    [Fact]
    public async Task Update_from_another_tenant_returns_400_not_the_others_data()
    {
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var ownerClient = AuthenticatedClient(owner);
        var createResponse = await ownerClient.PostAsJsonAsync(CategoriesUrl, new { name = "Owner's Category" });
        var categoryId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var intruderClient = AuthenticatedClient(intruder);
        var response = await intruderClient.PutAsJsonAsync($"{CategoriesUrl}/{categoryId}", new { name = "Hijacked" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_with_valid_changes_persists_them()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(CategoriesUrl, new { name = "Before" });
        var categoryId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var updateResponse = await client.PutAsJsonAsync($"{CategoriesUrl}/{categoryId}", new { name = "After" });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("After");
    }

    [Fact]
    public async Task Delete_then_list_no_longer_contains_the_category()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(CategoriesUrl, new { name = "Temporary" });
        var categoryId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var deleteResponse = await client.DeleteAsync($"{CategoriesUrl}/{categoryId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var categories = await (await client.GetAsync(CategoriesUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        categories.Should().NotContain(c => c.GetProperty("id").GetGuid() == categoryId);
    }

    [Fact]
    public async Task Delete_with_an_unknown_id_returns_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.DeleteAsync($"{CategoriesUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_a_category_referenced_by_a_service_is_blocked_with_the_affected_count()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        var categoryId = await CreateCategoryAsync(client, "In Use");
        await client.PostAsJsonAsync("/api/v1/services", NewServiceBody("Haircut", categoryId));

        var response = await client.DeleteAsync($"{CategoriesUrl}/{categoryId}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("title").GetString().Should().Contain("1 serviço(s)");

        var stillListed = await (await client.GetAsync(CategoriesUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        stillListed.Should().Contain(c => c.GetProperty("id").GetGuid() == categoryId);
    }

    [Fact]
    public async Task List_with_a_search_term_only_returns_matching_categories()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        await CreateCategoryAsync(client, "Massagens");
        await CreateCategoryAsync(client, "Estética");

        var response = await client.GetAsync($"{CategoriesUrl}?search=massa");

        var categories = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        categories.Should().ContainSingle(c => c.GetProperty("name").GetString() == "Massagens");
    }

    [Theory]
    [MemberData(nameof(MaliciousPayloads.Values), MemberType = typeof(MaliciousPayloads))]
    public async Task Create_with_a_malicious_payload_round_trips_it_as_inert_data(string payload)
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var createResponse = await client.PostAsJsonAsync(CategoriesUrl, new { name = payload });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("name").GetString().Should().Be(payload);

        var categories = await (await client.GetAsync(CategoriesUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        categories.Should().Contain(c => c.GetProperty("name").GetString() == payload);
    }

    private static async Task<Guid> CreateCategoryAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync(CategoriesUrl, new { name });
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static object NewServiceBody(string name, Guid? categoryId) => new
    {
        name,
        description = (string?)null,
        durationMinutes = 30,
        minDurationMinutes = 15,
        maxDurationMinutes = 60,
        price = 10.00m,
        maxDiscountPercentage = 10m,
        categoryId,
        tagIds = (Guid[]?)null,
    };

    private HttpClient AuthenticatedClient(Guid tenantId) => AuthenticatedClient(tenantId.ToString());

    private HttpClient AuthenticatedClient(string tokenValue)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tokenValue);

        if (tokenValue != "M2M")
        {
            client.DefaultRequestHeaders.Add("X-Tenant-Id", tokenValue);
        }

        return client;
    }
}
