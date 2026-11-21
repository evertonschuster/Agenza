using System.Security.Claims;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.Tests;

public sealed class TenantAuthorizationTests
{
    private static ServiceProvider Provider()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Identity:Authority"] = "https://identity.test/" }).Build();
        return new ServiceCollection().AddLogging()
            .AddIdentityServiceAuthentication(configuration, "services-api").BuildServiceProvider();
    }

    private static ClaimsPrincipal Principal(string? tenant, bool authenticated = true)
    {
        var identity = new ClaimsIdentity(authenticated ? "Bearer" : null);
        if (tenant is not null)
        {
            identity.AddClaim(new Claim("tenant_id", tenant));
        }
        return new ClaimsPrincipal(identity);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("tenant-invalido", false)]
    [InlineData("00000000-0000-0000-0000-000000000000", false)]
    [InlineData("04b6ea04-b83b-4a5f-abcc-edb5042545ca", true)]
    public async Task Politicas_nomeada_padrao_e_global_exigem_o_mesmo_tenant_valido(string? tenant, bool expected)
    {
        await using var provider = Provider();
        var policies = provider.GetRequiredService<IAuthorizationPolicyProvider>();
        var authorization = provider.GetRequiredService<IAuthorizationService>();
        var principal = Principal(tenant);
        AuthorizationPolicy[] configured = [
            (await policies.GetPolicyAsync(TenantAuthorizationExtensions.PolicyName))!,
            await policies.GetDefaultPolicyAsync(),
            (await policies.GetFallbackPolicyAsync())!,
        ];

        foreach (var policy in configured)
        {
            var result = await authorization.AuthorizeAsync(principal, resource: null, policy);
            result.Succeeded.Should().Be(expected);
        }
    }

    [Fact]
    public async Task Tenant_valido_nao_autoriza_principal_nao_autenticado()
    {
        await using var provider = Provider();
        var result = await provider.GetRequiredService<IAuthorizationService>().AuthorizeAsync(
            Principal(Guid.NewGuid().ToString(), authenticated: false), null, TenantAuthorizationExtensions.PolicyName);

        result.Succeeded.Should().BeFalse();
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("identificador-nao-guid", "outro-escopo")]
    public async Task Politica_compartilhada_nao_exige_sub_ou_escopo(string? sub, string? scope)
    {
        await using var provider = Provider();
        var principal = Principal(Guid.NewGuid().ToString());
        var identity = (ClaimsIdentity)principal.Identity!;
        if (sub is not null)
        {
            identity.AddClaim(new Claim("sub", sub));
        }
        if (scope is not null)
        {
            identity.AddClaim(new Claim("scope", scope));
        }
        var result = await provider.GetRequiredService<IAuthorizationService>().AuthorizeAsync(
            principal, null, TenantAuthorizationExtensions.PolicyName);

        result.Succeeded.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("invalido")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public void Accessor_e_politica_compartilham_a_definicao_de_tenant_invalido(string? tenant)
    {
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = Principal(tenant) },
        });

        accessor.TryGetTenantId(out _).Should().BeFalse();
        var read = () => accessor.TenantId;
        read.Should().Throw<InvalidOperationException>();
    }
}
