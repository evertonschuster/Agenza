using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace IdentityService.IntegrationTests;

/// <summary>
/// End-to-end coverage of the M2M surface: OIDC discovery, the
/// client-credentials flow, and the scope-guarded internal provisioning
/// endpoint - the layers (Api + Infrastructure) the unit-test coverage
/// gate cannot see.
/// </summary>
public class ProvisioningEndpointTests : IClassFixture<IdentityApiFactory>
{
    private readonly IdentityApiFactory _factory;

    public ProvisioningEndpointTests(IdentityApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Discovery_document_is_served()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/.well-known/openid-configuration");

        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.EndsWith("/connect/token", document.RootElement.GetProperty("token_endpoint").GetString());
    }

    [Fact]
    public async Task Client_credentials_flow_issues_an_access_token()
    {
        var client = _factory.CreateClient();

        var token = await RequestTokenAsync(
            client, "tenant-provisioning-cli", IdentityApiFactory.ProvisioningSecret, "identity-admin");

        Assert.False(string.IsNullOrWhiteSpace(token));
    }

    [Fact]
    public async Task Token_request_with_a_wrong_secret_is_rejected()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/connect/token", TokenRequestContent(
            "tenant-provisioning-cli", "wrong-secret", "identity-admin"));

        Assert.False(response.IsSuccessStatusCode);
        Assert.Contains("invalid_client", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Provisioning_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/internal/tenants", new
        {
            tenantName = "No Token Studio",
            ownerEmail = "no-token@example.com",
            ownerPassword = "OwnerPass123",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Provisioning_with_a_token_missing_the_admin_scope_is_forbidden()
    {
        var client = _factory.CreateClient();
        var workerToken = await RequestTokenAsync(
            client, "assistant-service-worker", IdentityApiFactory.WorkerSecret, "services-api");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);

        var response = await client.PostAsJsonAsync("/internal/tenants", new
        {
            tenantName = "Wrong Scope Studio",
            ownerEmail = "wrong-scope@example.com",
            ownerPassword = "OwnerPass123",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Provisioning_with_the_admin_scope_creates_tenant_and_owner()
    {
        var client = _factory.CreateClient();
        var adminToken = await RequestTokenAsync(
            client, "tenant-provisioning-cli", IdentityApiFactory.ProvisioningSecret, "identity-admin");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await client.PostAsJsonAsync("/internal/tenants", new
        {
            tenantName = "Bella Studio",
            ownerEmail = "owner@bella-studio.example.com",
            ownerPassword = "OwnerPass123",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var tenantId = body.RootElement.GetProperty("tenantId").GetGuid();
        Assert.NotEqual(Guid.Empty, tenantId);
        Assert.NotEqual(Guid.Empty, body.RootElement.GetProperty("ownerUserId").GetGuid());
        Assert.EndsWith($"/internal/tenants/{tenantId}", response.Headers.Location?.ToString());
    }

    private static FormUrlEncodedContent TokenRequestContent(string clientId, string secret, string scope) =>
        new(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = clientId,
            ["client_secret"] = secret,
            ["scope"] = scope,
        });

    private static async Task<string> RequestTokenAsync(
        HttpClient client, string clientId, string secret, string scope)
    {
        var response = await client.PostAsync("/connect/token", TokenRequestContent(clientId, secret, scope));
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("Token response contained no access_token.");
    }
}
