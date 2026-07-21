using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ServicesService.IntegrationTests;

public class TagsEndpointTests : IClassFixture<ServicesApiFactory>
{
    private const string TagsUrl = "/api/v1/tags";

    private readonly ServicesApiFactory _factory;

    public TagsEndpointTests(ServicesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(TagsUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task List_with_an_M2M_token_that_has_no_tenant_is_forbidden()
    {
        var client = AuthenticatedClient("M2M");

        var response = await client.GetAsync(TagsUrl);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_then_list_round_trips_a_tag()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);

        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "VIP",
            color = "#0d9488",
            description = "High-value client",
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var tagId = created.GetProperty("id").GetGuid();
        createResponse.Headers.Location?.ToString().Should().EndWith($"/api/v1/tags/{tagId}");
        created.GetProperty("name").GetString().Should().Be("VIP");
        created.GetProperty("color").GetString().Should().Be("#0d9488");
        created.GetProperty("description").GetString().Should().Be("High-value client");

        var listResponse = await client.GetAsync(TagsUrl);
        var tags = await listResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        tags.Should().Contain(t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Create_with_an_invalid_color_returns_a_problem_details_400()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "Bad Color",
            color = "#123456",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_an_empty_name_is_rejected_by_validation_before_the_handler_runs()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "",
            color = "#0d9488",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_a_duplicate_name_in_the_same_tenant_returns_409()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        await client.PostAsJsonAsync(TagsUrl, new { name = "Duplicate", color = "#0d9488", description = (string?)null });

        var response = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "duplicate", // case-insensitive match
            color = "#ef4444",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("Tag.DuplicateName");
    }

    [Fact]
    public async Task Create_with_leading_and_trailing_whitespace_matches_an_existing_trimmed_name()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        await client.PostAsJsonAsync(TagsUrl, new { name = "VIP", color = "#0d9488", description = (string?)null });

        var response = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "  VIP  ",
            color = "#ef4444",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_keeping_its_own_name_unchanged_does_not_conflict_with_itself()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "VIP",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var response = await client.PutAsJsonAsync($"{TagsUrl}/{tagId}", new
        {
            name = "VIP",
            color = "#ef4444",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task List_only_returns_tags_belonging_to_the_caller_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var clientA = AuthenticatedClient(tenantA);
        var clientB = AuthenticatedClient(tenantB);

        // Same name is allowed across tenants - they are unrelated records.
        await clientA.PostAsJsonAsync(TagsUrl, new { name = "Shared Name", color = "#0d9488", description = (string?)null });
        await clientB.PostAsJsonAsync(TagsUrl, new { name = "Shared Name", color = "#ef4444", description = (string?)null });

        var tagsA = await (await clientA.GetAsync(TagsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        var tagsB = await (await clientB.GetAsync(TagsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();

        tagsA.Should().OnlyContain(t => t.GetProperty("color").GetString() == "#0d9488");
        tagsB.Should().OnlyContain(t => t.GetProperty("color").GetString() == "#ef4444");
    }

    [Fact]
    public async Task Update_from_another_tenant_returns_404_not_the_others_data()
    {
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var ownerClient = AuthenticatedClient(owner);
        var createResponse = await ownerClient.PostAsJsonAsync(TagsUrl, new
        {
            name = "Owner's Tag",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var intruderClient = AuthenticatedClient(intruder);
        var response = await intruderClient.PutAsJsonAsync($"{TagsUrl}/{tagId}", new
        {
            name = "Hijacked",
            color = "#ef4444",
            description = (string?)null,
        });

        // The tenant query filter hides another tenant's row entirely - it
        // reads as "doesn't exist", not a 400 shape error (docs/adr/0012).
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("Tag.NotFound");
    }

    [Fact]
    public async Task Update_with_valid_changes_persists_them()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "Before",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var updateResponse = await client.PutAsJsonAsync($"{TagsUrl}/{tagId}", new
        {
            name = "After",
            color = "#ef4444",
            description = "Now with a description",
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("After");
        updated.GetProperty("color").GetString().Should().Be("#ef4444");
        updated.GetProperty("description").GetString().Should().Be("Now with a description");
    }

    [Fact]
    public async Task Delete_then_list_no_longer_contains_the_tag()
    {
        var tenantId = Guid.NewGuid();
        var client = AuthenticatedClient(tenantId);
        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "Temporary",
            color = "#22c55e",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var deleteResponse = await client.DeleteAsync($"{TagsUrl}/{tagId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var tags = await (await client.GetAsync(TagsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        tags.Should().NotContain(t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Delete_with_an_unknown_id_returns_404()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.DeleteAsync($"{TagsUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_a_tag_referenced_by_a_service_is_blocked_with_the_affected_count()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        var createTagResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "In Use",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createTagResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await client.PostAsJsonAsync("/api/v1/services", new
        {
            name = "Haircut",
            description = (string?)null,
            durationMinutes = 30,
            minDurationMinutes = 15,
            maxDurationMinutes = 60,
            price = 10.00m,
            maxDiscountPercentage = 10m,
            categoryId = (Guid?)null,
            tagIds = new[] { tagId },
        });

        var response = await client.DeleteAsync($"{TagsUrl}/{tagId}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("title").GetString().Should().Contain("1 serviço(s)");

        var stillListed = await (await client.GetAsync(TagsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        stillListed.Should().Contain(t => t.GetProperty("id").GetGuid() == tagId);
    }

    [Fact]
    public async Task Create_after_deleting_a_tag_with_the_same_name_reuses_it()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "Reusable",
            color = "#0d9488",
            description = (string?)null,
        });
        var tagId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await client.DeleteAsync($"{TagsUrl}/{tagId}");

        // The unique index is filtered to non-deleted rows (docs/adr/0012) -
        // a soft-deleted tag's name is free to reuse.
        var recreateResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "Reusable",
            color = "#ef4444",
            description = (string?)null,
        });

        recreateResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_with_multiple_invalid_fields_returns_a_structured_error_per_field()
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = "",
            color = "#123456",
            description = (string?)null,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("Validation.Failed");
        var errors = problem.GetProperty("errors");
        errors.GetProperty("Name").EnumerateArray().Should().NotBeEmpty();
        errors.GetProperty("Color").EnumerateArray().Should().NotBeEmpty();
    }

    [Fact]
    public async Task List_with_a_search_term_only_returns_matching_tags()
    {
        var client = AuthenticatedClient(Guid.NewGuid());
        await client.PostAsJsonAsync(TagsUrl, new { name = "VIP", color = "#0d9488", description = (string?)null });
        await client.PostAsJsonAsync(TagsUrl, new { name = "Novo cliente", color = "#ef4444", description = (string?)null });

        var response = await client.GetAsync($"{TagsUrl}?search=vip");

        var tags = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        tags.Should().ContainSingle(t => t.GetProperty("name").GetString() == "VIP");
    }

    [Theory]
    [MemberData(nameof(MaliciousPayloads.Values), MemberType = typeof(MaliciousPayloads))]
    public async Task Create_with_a_malicious_payload_round_trips_it_as_inert_data(string payload)
    {
        var client = AuthenticatedClient(Guid.NewGuid());

        var createResponse = await client.PostAsJsonAsync(TagsUrl, new
        {
            name = payload,
            color = "#0d9488",
            description = (string?)null,
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("name").GetString().Should().Be(payload);

        var tags = await (await client.GetAsync(TagsUrl)).Content.ReadFromJsonAsync<JsonElement[]>();
        tags.Should().Contain(t => t.GetProperty("name").GetString() == payload);
    }

    private HttpClient AuthenticatedClient(Guid tenantId) => AuthenticatedClient(tenantId.ToString());

    private HttpClient AuthenticatedClient(string tokenValue)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", tokenValue);

        // TenantHeaderFilter requires X-Tenant-Id to match the token's
        // tenant_id claim (docs/adr/0006) - "M2M" carries no tenant_id
        // claim at all, so it deliberately gets no header either.
        if (tokenValue != "M2M")
        {
            client.DefaultRequestHeaders.Add("X-Tenant-Id", tokenValue);
        }

        return client;
    }
}
