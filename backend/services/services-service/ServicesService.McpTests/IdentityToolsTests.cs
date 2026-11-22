using System.Security.Claims;
using System.Text.Json;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Http;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class IdentityToolsTests
{
    [Fact]
    public void Identidade_retorna_usuario_e_tenant_da_requisicao_atual()
    {
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var context = Context(userId, tenantId, "maria", "maria@exemplo.com", "Clínica Maria");
        context.Request.Headers["X-Tenant-Id"] = Guid.NewGuid().ToString();
        var httpContextAccessor = new HttpContextAccessor { HttpContext = context };
        var tools = Tools(httpContextAccessor);

        var response = tools.WhoAmI();

        response.User.Should().Be(new CurrentIdentityUser(userId, "maria", "maria@exemplo.com"));
        response.Tenant.Id.Should().Be(tenantId);
        response.Tenant.Name.Should().Be("Clínica Maria");
        var json = JsonSerializer.SerializeToElement(response, McpJsonUtilities.DefaultOptions);
        json.GetProperty("tenant").GetProperty("name").GetString().Should().Be("Clínica Maria");
    }

    [Fact]
    public void Identidade_nao_reutiliza_usuario_ou_tenant_de_outra_requisicao()
    {
        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = Context(Guid.NewGuid(), Guid.NewGuid(), "maria", "maria@exemplo.com", "Clínica Maria"),
        };
        var tools = Tools(httpContextAccessor);
        var previous = tools.WhoAmI();
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        httpContextAccessor.HttpContext = Context(userId, tenantId, "joao", "joao@exemplo.com", "Salão João");

        var response = tools.WhoAmI();

        response.User.Should().Be(new CurrentIdentityUser(userId, "joao", "joao@exemplo.com"));
        response.Tenant.Id.Should().Be(tenantId).And.NotBe(previous.Tenant.Id);
        response.Tenant.Name.Should().Be("Salão João").And.NotBe(previous.Tenant.Name);
    }

    [Fact]
    public void Identidade_preserva_campos_ausentes_sem_inventar_usuario()
    {
        var tenantId = Guid.NewGuid();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("tenant_id", tenantId.ToString())], "Bearer")),
        };
        var tools = Tools(new HttpContextAccessor { HttpContext = context });

        var response = tools.WhoAmI();

        response.User.Should().Be(new CurrentIdentityUser(null, null, null));
        response.Tenant.Id.Should().Be(tenantId);
        response.Tenant.Name.Should().BeNull();
        var json = JsonSerializer.SerializeToElement(response, McpJsonUtilities.DefaultOptions);
        json.GetProperty("tenant").GetProperty("name").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public void Ferramenta_publica_contrato_estruturado_somente_leitura_sem_parametros()
    {
        var tools = Tools(new HttpContextAccessor());
        var tool = McpServerTool.Create(typeof(IdentityTools).GetMethod(nameof(IdentityTools.WhoAmI))!, tools);
        var contract = tool.ProtocolTool;

        contract.Name.Should().Be("who_am_i");
        contract.InputSchema.GetProperty("properties").EnumerateObject().Should().BeEmpty();
        contract.OutputSchema.Should().NotBeNull();
        contract.Annotations!.ReadOnlyHint.Should().BeTrue();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.OpenWorldHint.Should().BeFalse();

        var json = JsonSerializer.SerializeToElement(
            new CurrentIdentityResponse(new CurrentIdentityUser(null, null, null), new CurrentIdentityTenant(Guid.NewGuid(), null)),
            McpJsonUtilities.DefaultOptions);

        json.GetProperty("user").GetProperty("id").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("user").GetProperty("username").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("user").GetProperty("email").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("tenant").GetProperty("id").GetGuid().Should().NotBeEmpty();
        json.GetProperty("tenant").GetProperty("name").ValueKind.Should().Be(JsonValueKind.Null);
    }

    private static IdentityTools Tools(IHttpContextAccessor accessor) => new(
        new HttpContextCurrentUserAccessor(accessor), new HttpContextTenantAccessor(accessor));

    private static DefaultHttpContext Context(Guid userId, Guid tenantId, string username, string email, string tenantName) => new()
    {
        User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", userId.ToString()), new Claim("tenant_id", tenantId.ToString()),
             new Claim("name", username), new Claim("email", email), new Claim("tenant_name", tenantName)], "Bearer")),
    };
}
