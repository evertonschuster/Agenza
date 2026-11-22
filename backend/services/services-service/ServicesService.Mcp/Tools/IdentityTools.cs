using System.ComponentModel;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Tools;

[Authorize]
[McpServerToolType]
public sealed class IdentityTools(ICurrentUserAccessor currentUserAccessor, ITenantAccessor tenantAccessor)
{
    [McpServerTool(Name = "who_am_i", Title = "Quem sou eu", ReadOnly = true, Destructive = false, OpenWorld = false, UseStructuredContent = true)]
    [Description("Retorna o ID, o login e o e-mail do usuário autenticado e o ID e o nome do tenant da conexão atual com o Agenza. Campos ausentes são retornados como nulos.")]
    public CurrentIdentityResponse WhoAmI() => new(
        new CurrentIdentityUser(currentUserAccessor.UserId, currentUserAccessor.Username, currentUserAccessor.Email),
        new CurrentIdentityTenant(tenantAccessor.TenantId, tenantAccessor.TenantName));
}
