using System.Text.Json;
using Admin.SharedKernel;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;

namespace ServicesService.Mcp.Extensions;

public static class ResultExtensions
{
    public static CallToolResult ToToolResult<T>(this Result<T> result)
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
