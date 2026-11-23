using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

public static class JsonSerializerOptionsExtensions
{
    public static JsonSerializerOptions AddValueObjectConverters(this JsonSerializerOptions options, TimeProvider timeProvider)
    {
        options.Converters.Add(new ValueObjectJsonConverterFactory(timeProvider));
        return options;
    }

    public static JsonSerializerOptions AddEnumNameConverter(this JsonSerializerOptions options)
    {
        // First in line: a host that already registered a lenient enum converter (the MCP SDK does) would win otherwise.
        options.Converters.Insert(0, new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        return options;
    }
}
