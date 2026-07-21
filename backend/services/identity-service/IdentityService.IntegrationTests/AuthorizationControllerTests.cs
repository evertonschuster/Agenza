namespace IdentityService.IntegrationTests;

public class AuthorizationControllerTests : IClassFixture<IdentityApiFactory>
{
    private readonly IdentityApiFactory _factory;

    public AuthorizationControllerTests(IdentityApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Token_request_with_an_unsupported_grant_type_returns_a_protocol_error_not_a_500()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/connect/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:device_code",
            ["client_id"] = "tenant-provisioning-cli",
            ["client_secret"] = IdentityApiFactory.ProvisioningSecret,
        }));

        response.IsSuccessStatusCode.Should().BeFalse();
        ((int)response.StatusCode).Should().BeLessThan(500);
        (await response.Content.ReadAsStringAsync()).Should().Contain("unsupported_grant_type");
    }
}
