using System.Security.Claims;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Http;

namespace Admin.SharedKernel.Tests;

public sealed class TenantAccessorTests
{
    [Fact]
    public void Tenant_autenticado_disponibiliza_id_e_nome_das_claims()
    {
        var tenantId = Guid.NewGuid();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("tenant_id", tenantId.ToString()), new Claim("tenant_name", "Clínica Maria")], "Bearer")),
        };
        context.Request.Headers["X-Tenant-Name"] = "Outro estabelecimento";
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.TenantId.Should().Be(tenantId);
        accessor.TenantName.Should().Be("Clínica Maria");
    }

    [Fact]
    public void Token_antigo_sem_nome_preserva_acesso_ao_id()
    {
        var tenantId = Guid.NewGuid();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("tenant_id", tenantId.ToString())], "Bearer")),
        };
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.TenantId.Should().Be(tenantId);
        accessor.TenantName.Should().BeNull();
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("invalido", true)]
    [InlineData("00000000-0000-0000-0000-000000000000", true)]
    [InlineData("04b6ea04-b83b-4a5f-abcc-edb5042545ca", false)]
    public void Nome_nao_e_exposto_sem_autenticacao_e_tenant_valido(string? tenantId, bool authenticated)
    {
        var identity = new ClaimsIdentity(authenticated ? "Bearer" : null);
        identity.AddClaim(new Claim("tenant_name", "Clínica Maria"));
        if (tenantId is not null)
        {
            identity.AddClaim(new Claim("tenant_id", tenantId));
        }

        var context = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.TenantName.Should().BeNull();
    }

    [Fact]
    public void Sem_requisicao_nao_ha_nome_do_tenant()
    {
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor());

        accessor.TenantName.Should().BeNull();
    }
}
