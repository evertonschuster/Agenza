using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ServicesService.RuntimeTests;

[Collection(PostgresRuntimeCollection.Name)]
public sealed class TenantHttpBoundaryTests(PostgresRuntimeFixture fixture)
{
    [Fact]
    public async Task HealthEndpoints_AreAnonymousAndIncludeDatabaseReadiness()
    {
        using var client = CreateClient();

        var readiness = await client.GetAsync("/health");
        var liveness = await client.GetAsync("/alive");
        var openApi = await client.GetAsync("/openapi/v1.json");

        readiness.StatusCode.Should().Be(HttpStatusCode.OK);
        liveness.StatusCode.Should().Be(HttpStatusCode.OK);
        openApi.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task List_WithoutAuthentication_ReturnsStableUnauthorizedProblem()
    {
        using var client = CreateClient();

        var response = await client.GetAsync("/api/v1/categories");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("Authorization.Unauthorized");
    }

    [Fact]
    public async Task List_WithMissingOrMismatchedTenantHeader_IsForbidden()
    {
        var claimTenant = Guid.NewGuid();

        using var missingHeaderClient = CreateClient(claimTenant);
        var missingHeader = await missingHeaderClient.GetAsync("/api/v1/categories");

        using var mismatchClient = CreateClient(claimTenant, Guid.NewGuid());
        var mismatch = await mismatchClient.GetAsync("/api/v1/categories");

        missingHeader.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        mismatch.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var problem = await mismatch.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("Tenant.ContextMismatch");
    }

    [Fact]
    public async Task Categories_AreIsolatedBetweenTwoAuthenticatedTenants()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var categoryA = $"Tenant A {Guid.NewGuid():N}";
        var categoryB = $"Tenant B {Guid.NewGuid():N}";

        using var clientA = CreateClient(tenantA, tenantA);
        using var clientB = CreateClient(tenantB, tenantB);

        (await clientA.PostAsJsonAsync("/api/v1/categories", new { name = categoryA }))
            .StatusCode.Should().Be(HttpStatusCode.Created);
        (await clientB.PostAsJsonAsync("/api/v1/categories", new { name = categoryB }))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        var tenantAResults = await clientA.GetFromJsonAsync<IReadOnlyList<CategoryDto>>(
            "/api/v1/categories");
        var tenantBResults = await clientB.GetFromJsonAsync<IReadOnlyList<CategoryDto>>(
            "/api/v1/categories");

        tenantAResults!.Select(category => category.Name)
            .Should().Contain(categoryA).And.NotContain(categoryB);
        tenantBResults!.Select(category => category.Name)
            .Should().Contain(categoryB).And.NotContain(categoryA);
    }

    [Fact]
    public async Task Tenant_CannotUpdateOrDeleteAnotherTenantsCategory()
    {
        var ownerTenant = Guid.NewGuid();
        var attackerTenant = Guid.NewGuid();
        var originalName = $"Owner category {Guid.NewGuid():N}";

        using var ownerClient = CreateClient(ownerTenant, ownerTenant);
        using var attackerClient = CreateClient(attackerTenant, attackerTenant);

        var createResponse = await ownerClient.PostAsJsonAsync(
            "/api/v1/categories",
            new { name = originalName });
        var category = await createResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var updateResponse = await attackerClient.PutAsJsonAsync(
            $"/api/v1/categories/{category!.Id}",
            new { name = $"Attacker update {Guid.NewGuid():N}" });
        var deleteResponse = await attackerClient.DeleteAsync(
            $"/api/v1/categories/{category.Id}");

        updateResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerResults = await ownerClient.GetFromJsonAsync<IReadOnlyList<CategoryDto>>(
            "/api/v1/categories");
        ownerResults!.Should().Contain(item =>
            item.Id == category.Id && item.Name == originalName);
    }

    private HttpClient CreateClient(Guid? claimTenant = null, Guid? headerTenant = null)
    {
        var client = fixture.Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
        });

        if (claimTenant.HasValue)
        {
            client.DefaultRequestHeaders.Add(
                TestAuthenticationHandler.TenantClaimHeader,
                claimTenant.Value.ToString());
        }

        if (headerTenant.HasValue)
        {
            client.DefaultRequestHeaders.Add("X-Tenant-Id", headerTenant.Value.ToString());
        }

        return client;
    }

    private sealed record CategoryDto(Guid Id, string Name);
}
