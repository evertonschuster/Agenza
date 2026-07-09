using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ServicesService.IntegrationTests;

/// <summary>
/// Replaces the real JwtBearer scheme for these tests (see
/// ServicesApiFactory). This service is a resource server, not an OIDC
/// provider - it has no token endpoint of its own, so forging a real,
/// signature-verifiable RS256 token would mean also booting a live
/// identity-service. Since Admin.Identity.Client's JWT/JWKS validation is
/// already exercised end-to-end by identity-service's own integration
/// tests, this handler builds the ClaimsPrincipal directly from a test
/// header and lets these tests focus on what's unique to this service:
/// controller behavior, ITenantAccessor, tenant scoping, and EF
/// persistence against real Postgres.
///
/// Header format: "Authorization: Test &lt;value&gt;"
///   - missing header            -> unauthenticated (real 401 challenge)
///   - value "M2M"               -> authenticated, no tenant_id claim
///                                  (simulates a client-credentials/worker token)
///   - value "&lt;tenant-guid&gt;"     -> authenticated, tenant_id = that guid
/// </summary>
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
