using System.Security.Claims;
using System.Text;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Admin.SharedKernel.Tests;

public class IdentityServiceAuthenticationTests
{
    private static readonly SymmetricSecurityKey SigningKey = new(Encoding.UTF8.GetBytes("a-test-signing-key-of-at-least-32-bytes"));

    private static JwtBearerOptions BearerOptions()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Identity:Authority"] = "http://localhost:5181",
                ["Identity:RequireHttpsMetadata"] = "false",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddIdentityServiceAuthentication(configuration, audience: "services-api");

        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IOptionsMonitor<JwtBearerOptions>>().Get(JwtBearerDefaults.AuthenticationScheme);
    }

    private static async Task<HttpContext> ContextAuthenticatedBy(JwtBearerOptions options, Guid userId, Guid tenantId)
    {
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Claims = new Dictionary<string, object>
            {
                ["sub"] = userId.ToString(),
                ["tenant_id"] = tenantId.ToString(),
            },
            SigningCredentials = new SigningCredentials(SigningKey, SecurityAlgorithms.HmacSha256),
        });
        var validation = await options.TokenHandlers.Single().ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            IssuerSigningKey = SigningKey,
        });
        validation.IsValid.Should().BeTrue();

        return new DefaultHttpContext { User = new ClaimsPrincipal(validation.ClaimsIdentity) };
    }

    [Fact]
    public void AddIdentityServiceAuthentication_KeepsTheClaimNamesTheTokenCarries()
    {
        BearerOptions().MapInboundClaims.Should().BeFalse();
    }

    [Fact]
    public async Task CurrentUser_ReadsTheSubjectOfAValidatedToken()
    {
        var userId = Guid.NewGuid();
        var context = await ContextAuthenticatedBy(BearerOptions(), userId, Guid.NewGuid());

        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task CurrentTenant_ReadsTheTenantOfAValidatedToken()
    {
        var tenantId = Guid.NewGuid();
        var context = await ContextAuthenticatedBy(BearerOptions(), Guid.NewGuid(), tenantId);

        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.TenantId.Should().Be(tenantId);
    }
}
