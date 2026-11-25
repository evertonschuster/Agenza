using System.Text.Json;
using System.Text.RegularExpressions;
using Admin.SharedKernel;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Setup;

internal static partial class BindingError
{
    private const string Code = "Validation.Failed";
    private const int MaxListedValues = 10;

    public static Error From(JsonException exception, RequestContext<CallToolRequestParams>? context)
    {
        var segments = Segments(exception.Path);
        var original = Build(segments.Count == 0 ? null : exception.Path, exception.Message, null);
        if (context?.Params?.Arguments is not { Count: 1 } arguments)
        {
            return original;
        }

        // The error path must never fail: anything unexpected in the schema falls back to the serializer's own message.
        try
        {
            var (argument, value) = arguments.Single();
            var path = Format(argument, segments);
            var expected = Expected(context, argument, value, segments);
            return expected is null
                ? Build(path, exception.Message, null)
                : Build(path, $"{path}: {expected}.", Capitalize(expected) + ".");
        }
        catch (Exception)
        {
            return original;
        }
    }

    private static Error Build(string? path, string message, string? fieldMessage) =>
        path is null
            ? Error.Validation(Code, message)
            : Error.Validation(Code, message, new Dictionary<string, IReadOnlyList<FieldError>>
            {
                [path] = [new FieldError(Code, fieldMessage ?? message)],
            });

    private static string? Expected(RequestContext<CallToolRequestParams> context, string argument, JsonElement value,
        List<object> segments)
    {
        var tool = context.Services?.GetServices<McpServerTool>().FirstOrDefault(tool => tool.ProtocolTool.Name == context.Params?.Name);
        if (tool is null
            || !tool.ProtocolTool.InputSchema.TryGetProperty("properties", out var properties)
            || !properties.TryGetProperty(argument, out var schema))
        {
            return null;
        }

        foreach (var segment in segments)
        {
            if (segment is string name)
            {
                if (value.ValueKind != JsonValueKind.Object
                    || !value.TryGetProperty(name, out value)
                    || !schema.TryGetProperty("properties", out var children)
                    || !children.TryGetProperty(name, out schema))
                {
                    return null;
                }
            }
            else
            {
                var index = (int)segment;
                if (value.ValueKind != JsonValueKind.Array
                    || index >= value.GetArrayLength()
                    || !schema.TryGetProperty("items", out schema))
                {
                    return null;
                }

                value = value[index];
            }
        }

        return Describe(schema, value);
    }

    private static string? Describe(JsonElement schema, JsonElement value)
    {
        if (schema.TryGetProperty("enum", out var options) && options.ValueKind == JsonValueKind.Array)
        {
            var allowed = options.EnumerateArray().ToList();
            return allowed.Any(option => option.ValueKind == value.ValueKind && option.GetRawText() == value.GetRawText())
                ? null
                : $"esperado um de: {string.Join(", ", allowed.Take(MaxListedValues).Select(option => option.GetRawText()))}"
                    + (allowed.Count > MaxListedValues ? ", ..." : string.Empty);
        }

        if (!schema.TryGetProperty("type", out var type))
        {
            return null;
        }

        var types = (type.ValueKind == JsonValueKind.Array ? type.EnumerateArray().Select(item => item.GetString()) : [type.GetString()])
            .Where(item => item is not null)
            .ToList();
        var accepted = types.Any(item => item switch
        {
            "integer" => value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out _),
            "number" => value.ValueKind == JsonValueKind.Number,
            "string" => value.ValueKind == JsonValueKind.String,
            "boolean" => value.ValueKind is JsonValueKind.True or JsonValueKind.False,
            "array" => value.ValueKind == JsonValueKind.Array,
            "object" => value.ValueKind == JsonValueKind.Object,
            "null" => value.ValueKind == JsonValueKind.Null,
            _ => true,
        });
        if (!accepted)
        {
            return Label(types.First(item => item != "null"), value);
        }

        return value.ValueKind == JsonValueKind.String
            && schema.TryGetProperty("format", out var format)
            && format.ValueEquals("uuid")
            ? "esperado um ID no formato UUID"
            : null;
    }

    private static string? Label(string? type, JsonElement value)
    {
        var expected = type switch
        {
            "integer" => "esperado número inteiro",
            "number" => "esperado número",
            "boolean" => "esperado verdadeiro ou falso",
            "string" => "esperado texto",
            "array" => "esperado lista",
            "object" => "esperado objeto",
            _ => null,
        };
        return expected is null ? null : $"{expected}, recebeu {Received(value, type)}";
    }

    // Only the kind is reported, never the value: the sent data may be sensitive.
    private static string Received(JsonElement value, string? expectedType) => value.ValueKind switch
    {
        JsonValueKind.String => "texto",
        JsonValueKind.Number => expectedType == "integer" ? "número não inteiro" : "número",
        JsonValueKind.True or JsonValueKind.False => "verdadeiro ou falso",
        JsonValueKind.Array => "lista",
        JsonValueKind.Object => "objeto",
        JsonValueKind.Null => "nulo",
        _ => "valor desconhecido",
    };

    private static List<object> Segments(string? path) =>
        string.IsNullOrWhiteSpace(path)
            ? []
            : PathSegment().Matches(path)
                .Select(match => match.Groups[1].Success ? (object)match.Groups[1].Value : int.Parse(match.Groups[2].Value))
                .ToList();

    private static string Format(string argument, List<object> segments) =>
        segments.Aggregate(argument, (path, segment) => segment is string name ? $"{path}.{name}" : $"{path}[{segment}]");

    private static string Capitalize(string text) => char.ToUpperInvariant(text[0]) + text[1..];

    [GeneratedRegex(@"\.([^.\[]+)|\[(\d+)\]")]
    private static partial Regex PathSegment();
}
