using System.Text.Json;

namespace Admin.SharedKernel;

public static class JsonSerializerOptionsExtensions
{
    public static JsonSerializerOptions AddValueObjectConverters(this JsonSerializerOptions options)
    {
        options.Converters.Add(new StringValueObjectJsonConverterFactory());
        return options;
    }
}
