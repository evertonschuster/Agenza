using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ServicesService.IntegrationTests;

// Replaces the real JwtBearer scheme (see ServicesApiFactory) - avoids booting a live identity-service just to forge a signed RS256 token.
// Header format: "Authorization: Test <value>" - missing = unauthenticated, "M2M" = authenticated with no tenant_id claim, else tenant_id = <value>.
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var header))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var value = header.ToString();
        const string prefix = SchemeName + " ";
        if (!value.StartsWith(prefix, StringComparison.Ordinal))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = value[prefix.Length..];
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, "test-principal") };

        if (token != "M2M")
        {
            claims.Add(new Claim("tenant_id", token));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
