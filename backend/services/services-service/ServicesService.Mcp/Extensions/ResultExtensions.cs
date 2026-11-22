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
            return result.Error.ToToolResult();
        }

        var content = JsonSerializer.SerializeToElement(result.Value, McpJsonUtilities.DefaultOptions);
        return new CallToolResult
        {
            IsError = false,
            StructuredContent = content,
            Content = [new TextContentBlock { Text = content.GetRawText() }],
        };
    }

    public static CallToolResult ToToolResult(this Error error, string? traceId = null, string? correlationId = null)
    {
        var content = JsonSerializer.SerializeToElement(new
        {
            Error = new
            {
                error.Code,
                error.Message,
                Type = error.Type.ToString(),
                error.FieldErrors,
                TraceId = traceId,
                CorrelationId = correlationId,
            },
        }, McpJsonUtilities.DefaultOptions);

        return new CallToolResult
        {
            IsError = true,
            Content = [new TextContentBlock { Text = content.GetRawText() }],
        };
    }
}
