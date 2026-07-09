using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ServicesService.IntegrationTests;

/// <summary>
/// End-to-end coverage of /api/tags against real Postgres - the layers
/// (Api + Infrastructure) the unit-test coverage gate cannot see:
/// authentication challenges, tenant scoping enforcement, EF persistence,
/// and the database-level unique-name-per-tenant constraint.
/// </summary>
public class TagsEndpointTests : IClassFixture<ServicesApiFactory>
{
    private readonly ServicesApiFactory _factory;

    public TagsEndpointTests(ServicesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/tags");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_with_an_M2M_token_that_has_no_tenant_is_forbidden()
    {
        var client = AuthenticatedClient("M2M");

        var response = await client.GetAsync("/api/tags");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_then_list_round_trips_a_tag()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var createResponse = await client.PostAsJsonAsync("/api/tags", new
        {
            name = "VIP",
            color = "#0d9488",
            description = "High-value client",
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var tagId = created.GetProperty("id").GetGuid();
        Assert.EndsWith($"/api/tags/{tagId}", createResponse.Headers.Location?.ToString());
        Assert.Equal("VIP", created.GetProperty("name").GetString());
        Assert.Equal("#0d9488", created.GetProperty("color").GetString());
        Assert.Equal("High-value client", created.GetProperty("description").GetString());

        var listResponse = await client.GetAsync("/api/tags");
        var tags = await listResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.Contains(tags!, t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Create_with_an_invalid_color_returns_a_problem_details_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/tags", new
        {
            name = "Bad Color",
            color = "#123456",
            description = (string?)null,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_with_a_duplicate_name_in_the_same_tenant_returns_409()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync("/api/tags", new { name = "Duplicate", color = "#0d9488", description = (string?)null });

        var response = await client.PostAsJsonAsync("/api/tags", new
        {
            name = "duplicate", // case-insensitive match
            color = "#ef4444",
            description = (string?)null,
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task List_only_returns_tags_belonging_to_the_caller_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var clientA = AuthenticatedClient(tenantA);
        var clientB = AuthenticatedClient(tenantB);

        // Same name is allowed across tenants - they are unrelated records.
        await clientA.PostAsJsonAsync("/api/tags", new { name = "Shared Name", color = "#0d9488", description = (string?)null });
        await clientB.PostAsJsonAsync("/api/tags", new { name = "Shared Name", color = "#ef4444", description = (string?)null });

        var tagsA = await (await clientA.GetAsync("/api/tags")).Content.ReadFromJsonAsync<JsonElement[]>();
        var tagsB = await (await clientB.GetAsync("/api/tags")).Content.ReadFromJsonAsync<JsonElement[]>();

        Assert.All(tagsA!, t => Assert.Equal("#0d9488", t.GetProperty("color").GetString()));
        Assert.All(tagsB!, t => Assert.Equal("#ef4444", t.GetProperty("color").GetString()));
    }

    [Fact]
    public async Task Update_from_another_tenant_returns_404_not_the_others_data()
    {
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var ownerClient = AuthenticatedClient(owner);
        var createResponse = await ownerClient.PostAsJsonAsync("/api/tags", new
        {
            name = "Owner's Tag",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var intruderClient = AuthenticatedClient(intruder);
        var response = await intruderClient.PutAsJsonAsync($"/api/tags/{tagId}", new
        {
            name = "Hijacked",
            color = "#ef4444",
            description = (string?)null,
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_with_valid_changes_persists_them()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync("/api/tags", new
        {
            name = "Before",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var updateResponse = await client.PutAsJsonAsync($"/api/tags/{tagId}", new
        {
            name = "After",
            color = "#ef4444",
            description = "Now with a description",
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("After", updated.GetProperty("name").GetString());
        Assert.Equal("#ef4444", updated.GetProperty("color").GetString());
        Assert.Equal("Now with a description", updated.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Delete_then_list_no_longer_contains_the_tag()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync("/api/tags", new
        {
            name = "Temporary",
            color = "#22c55e",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var deleteResponse = await client.DeleteAsync($"/api/tags/{tagId}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        var tags = await (await client.GetAsync("/api/tags")).Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.DoesNotContain(tags!, t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Delete_with_an_unknown_id_returns_404()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.DeleteAsync($"/api/tags/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private HttpClient AuthenticatedClient(Guid tenantId) => AuthenticatedClient(tenantId.ToString());

    private HttpClient AuthenticatedClient(string tokenValue)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tokenValue);
        return client;
    }
}
