using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace IdentityService.IntegrationTests;

public class ProvisioningEndpointTests : IClassFixture<IdentityApiFactory>
{
    private const string TenantsUrl = "/internal/v1/tenants";

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
        document.RootElement.GetProperty("token_endpoint").GetString().Should().EndWith("/connect/token");
    }

    [Fact]
    public async Task Client_credentials_flow_issues_an_access_token()
    {
        var client = _factory.CreateClient();

        var token = await RequestTokenAsync(
            client, "tenant-provisioning-cli", IdentityApiFactory.ProvisioningSecret, "identity-admin");

        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Token_request_with_a_wrong_secret_is_rejected()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/connect/token", TokenRequestContent(
            "tenant-provisioning-cli", "wrong-secret", "identity-admin"));

        response.IsSuccessStatusCode.Should().BeFalse();
        (await response.Content.ReadAsStringAsync()).Should().Contain("invalid_client");
    }

    [Fact]
    public async Task Provisioning_without_a_token_is_unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "No Token Studio",
            ownerEmail = "no-token@example.com",
            ownerPassword = "OwnerPass123",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Provisioning_with_a_token_missing_the_admin_scope_is_forbidden()
    {
        var client = _factory.CreateClient();
        var workerToken = await RequestTokenAsync(
            client, "assistant-service-worker", IdentityApiFactory.WorkerSecret, "services-api");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);

        var response = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "Wrong Scope Studio",
            ownerEmail = "wrong-scope@example.com",
            ownerPassword = "OwnerPass123",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Provisioning_with_an_empty_tenant_name_is_rejected_by_validation()
    {
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "",
            ownerEmail = "empty-name@example.com",
            ownerPassword = "OwnerPass123",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Provisioning_with_the_admin_scope_creates_tenant_and_owner()
    {
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "Bella Studio",
            ownerEmail = "owner@bella-studio.example.com",
            ownerPassword = "OwnerPass123",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var tenantId = body.RootElement.GetProperty("tenantId").GetGuid();
        tenantId.Should().NotBe(Guid.Empty);
        body.RootElement.GetProperty("ownerUserId").GetGuid().Should().NotBe(Guid.Empty);
        response.Headers.Location?.ToString().Should().EndWith($"/internal/v1/tenants/{tenantId}");
    }

    [Fact]
    public async Task Provisioning_with_an_email_already_in_use_fails_and_rolls_back_the_tenant()
    {
        var client = await AdminClientAsync();
        const string reusedEmail = "reused-owner@example.com";
        await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "Owner Reuse Business One",
            ownerEmail = reusedEmail,
            ownerPassword = "OwnerPass123",
        });

        var conflictingResponse = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "Owner Reuse Business Two",
            ownerEmail = reusedEmail, // already used by the tenant above
            ownerPassword = "OwnerPass123",
        });

        conflictingResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // If the failed attempt's tenant row wasn't rolled back, its
        // unique tenant-name index would still be occupied and this
        // retry (a fresh owner email, same tenant name) would fail with
        // a database constraint error instead of succeeding.
        var retryResponse = await client.PostAsJsonAsync(TenantsUrl, new
        {
            tenantName = "Owner Reuse Business Two",
            ownerEmail = "distinct-owner@example.com",
            ownerPassword = "OwnerPass123",
        });

        retryResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task<HttpClient> AdminClientAsync()
    {
        var client = _factory.CreateClient();
        var adminToken = await RequestTokenAsync(
            client, "tenant-provisioning-cli", IdentityApiFactory.ProvisioningSecret, "identity-admin");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        return client;
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
