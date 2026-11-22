using System.ComponentModel;
using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Users.GetCurrentUser;

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
        return ToToolResult(result);
    }

    private static CallToolResult ToToolResult(Result<CurrentUserResponse> result)
    {
        if (result.IsFailure)
        {
            return new CallToolResult
            {
                IsError = true,
                Content = [new TextContentBlock { Text = result.Error.Message }],
            };
        }

        var content = JsonSerializer.SerializeToElement(result.Value, McpJsonUtilities.DefaultOptions);
        return new CallToolResult
        {
            StructuredContent = content,
            Content = [new TextContentBlock { Text = content.GetRawText() }],
        };
    }
}
