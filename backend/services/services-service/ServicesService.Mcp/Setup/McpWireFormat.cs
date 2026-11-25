using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.SharedKernel;
using ModelContextProtocol;

namespace ServicesService.Mcp.Setup;

internal static class McpWireFormat
{
    // The API's wire format: value object and enum converters, and nulls written out, over the SDK's camelCase defaults.
    public static JsonSerializerOptions Create(TimeProvider timeProvider)
    {
        var options = new JsonSerializerOptions(McpJsonUtilities.DefaultOptions)
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        };

        options.AddValueObjectConverters(timeProvider).AddEnumNameConverter();

        // The SDK's defaults already hold a lenient enum converter that would win over ours if ours stayed last.
        var enumConverter = options.Converters[^1];
        options.Converters.RemoveAt(options.Converters.Count - 1);
        options.Converters.Insert(0, enumConverter);
        return options;
    }
}
