using System.Text.Json;
using Admin.SharedKernel;
using ModelContextProtocol.Protocol;

namespace ServicesService.Mcp.Setup;

public static class ToolResultExtensions
{
    private static readonly JsonSerializerOptions WireFormat = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        .AddEnumNameConverter();

    public static CallToolResult ToToolResult<TValue>(this Result<TValue> result)
    {
        if (result.IsFailure)
        {
            return Failure(result.Error);
        }

        var structured = JsonSerializer.SerializeToElement(result.Value, WireFormat);
        return new CallToolResult
        {
            StructuredContent = structured,
            Content = [new TextContentBlock { Text = structured.GetRawText() }],
        };
    }

    public static CallToolResult Failure(Error error)
    {
        var fields = error.FieldErrors?
            .SelectMany(field => field.Value.Select(fieldError => $"{field.Key}: {fieldError.Message} ({fieldError.Code})"))
            ?? [];

        return new CallToolResult
        {
            IsError = true,
            Content = [new TextContentBlock { Text = string.Join('\n', [$"{error.Message} ({error.Code})", .. fields]) }],
        };
    }
}
