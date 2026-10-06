using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel;

internal sealed class ValueObjectJsonConverterFactory(TimeProvider timeProvider) : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        StringValueObjects.Is(typeToConvert) || DateValueObjects.Is(typeToConvert);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        if (StringValueObjects.Is(typeToConvert))
        {
            return (JsonConverter)Activator.CreateInstance(typeof(StringValueObjectJsonConverter<>).MakeGenericType(typeToConvert))!;
        }

        return (JsonConverter)Activator.CreateInstance(typeof(DateValueObjectJsonConverter<>).MakeGenericType(typeToConvert), timeProvider)!;
    }
}
