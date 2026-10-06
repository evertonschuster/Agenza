using System.Text.Json;

namespace Admin.SharedKernel;

public static class JsonSerializerOptionsExtensions
{
    public static JsonSerializerOptions AddValueObjectConverters(this JsonSerializerOptions options, TimeProvider timeProvider)
    {
        options.Converters.Add(new ValueObjectJsonConverterFactory(timeProvider));
        return options;
    }
}
