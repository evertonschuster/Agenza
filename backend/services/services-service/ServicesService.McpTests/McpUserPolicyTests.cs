using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

public sealed class McpUserPolicyTests
{
    private static readonly string UserId = Guid.NewGuid().ToString();
    private static readonly string TenantId = Guid.NewGuid().ToString();

    [Fact]
    public async Task Token_com_usuario_tenant_e_escopo_mcp_connect_e_autorizado()
    {
        var result = await AuthorizeAsync(Principal(UserId, TenantId, "openid mcp:connect offline_access"));

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task Principal_nao_autenticado_e_recusado()
    {
        var identity = new ClaimsIdentity(
            [new Claim("sub", UserId), new Claim("tenant_id", TenantId), new Claim("scope", "mcp:connect")]);

        var result = await AuthorizeAsync(new ClaimsPrincipal(identity));

        result.Succeeded.Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("nao-e-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task Token_sem_usuario_valido_e_recusado(string? sub)
    {
        var result = await AuthorizeAsync(Principal(sub, TenantId, "mcp:connect"));

        result.Succeeded.Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("nao-e-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task Token_sem_tenant_valido_e_recusado(string? tenantId)
    {
        var result = await AuthorizeAsync(Principal(UserId, tenantId, "mcp:connect"));

        result.Succeeded.Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("openid offline_access")]
    [InlineData("services-api")]
    [InlineData("mcp:connect:extra")]
    [InlineData("MCP:CONNECT")]
    public async Task Token_sem_escopo_mcp_connect_e_recusado(string? scope)
    {
        var result = await AuthorizeAsync(Principal(UserId, TenantId, scope));

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task Header_X_Tenant_Id_nao_participa_da_decisao()
    {
        var principal = Principal(UserId, TenantId, "mcp:connect");

        var withOtherTenant = await AuthorizeAsync(principal, Guid.NewGuid().ToString());
        var withoutTenant = await AuthorizeAsync(Principal(UserId, null, "mcp:connect"), TenantId);

        withOtherTenant.Succeeded.Should().BeTrue();
        withoutTenant.Succeeded.Should().BeFalse();
    }

    private static ClaimsPrincipal Principal(string? sub, string? tenantId, string? scope)
    {
        var claims = new List<Claim>();
        if (sub is not null)
        {
            claims.Add(new Claim("sub", sub));
        }

        if (tenantId is not null)
        {
            claims.Add(new Claim("tenant_id", tenantId));
        }

        if (scope is not null)
        {
            claims.Add(new Claim("scope", scope));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));
    }

    private static async Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal principal, params string[] tenantHeader)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Identity:Authority"] = "https://identity.test/",
                ["Mcp:Resource"] = "https://mcp.test/mcp",
            })
            .Build();
        var services = new ServiceCollection().AddLogging().AddMcpAuthentication(configuration);
        await using var provider = services.BuildServiceProvider();
        var httpContext = new DefaultHttpContext { User = principal };
        if (tenantHeader.Length > 0)
        {
            httpContext.Request.Headers["X-Tenant-Id"] = tenantHeader;
        }

        return await provider.GetRequiredService<IAuthorizationService>().AuthorizeAsync(principal, httpContext, AuthenticationExtensions.McpUserPolicy);
    }
}
