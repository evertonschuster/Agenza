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
        "Use para identificar a conexão atual, sem informar usuário ou tenant como entrada. " +
        "Os dados refletem a identidade autenticada e podem mudar após a renovação do token. " +
        "Campos nulos indicam informação indisponível, não ausência de autenticação. " +
        "Este resultado não descreve permissões para operações de negócio.")]
    public async Task<CallToolResult> WhoAmI(CancellationToken cancellationToken)
    {
        var result = await dispatcher.Query(new GetCurrentUserQuery(), cancellationToken);
        return result.ToToolResult();
    }
}
