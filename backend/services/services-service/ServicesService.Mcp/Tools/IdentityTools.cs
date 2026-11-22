using System.ComponentModel;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Users.GetCurrentUser;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Tools;

[Authorize]
[McpServerToolType]
public sealed class IdentityTools(IDispatcher dispatcher)
{
    [McpServerTool(
        Name = "who_am_i",
        Title = "Quem sou eu",
        ReadOnly = true,
        Destructive = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(CurrentUserResponse))]
    [Description(
        "Retorna o ID, o login e o e-mail do usuário autenticado " +
        "e o ID e o nome do tenant da conexão atual com o Agenza. " +
        "Campos ausentes são retornados como nulos.")]
    public async Task<CallToolResult> WhoAmI(CancellationToken cancellationToken)
    {
        var result = await dispatcher.Query(new GetCurrentUserQuery(), cancellationToken);
        return result.ToToolResult();
    }
}
