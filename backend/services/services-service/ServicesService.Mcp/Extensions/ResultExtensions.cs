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
            var error = JsonSerializer.SerializeToElement(new
            {
                Error = new
                {
                    result.Error.Code,
                    result.Error.Message,
                    Type = result.Error.Type.ToString(),
                    result.Error.FieldErrors,
                },
            }, McpJsonUtilities.DefaultOptions);

            return new CallToolResult
            {
                IsError = true,
                Content = [new TextContentBlock { Text = error.GetRawText() }],
            };
        }

        var content = JsonSerializer.SerializeToElement(result.Value, McpJsonUtilities.DefaultOptions);
        return new CallToolResult
        {
            IsError = false,
            StructuredContent = content,
            Content = [new TextContentBlock { Text = content.GetRawText() }],
        };
    }
}
