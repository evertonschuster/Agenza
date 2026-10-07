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
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        return options;
    }
}
