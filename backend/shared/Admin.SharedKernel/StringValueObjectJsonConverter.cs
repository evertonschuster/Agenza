using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel;

internal sealed class StringValueObjectJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) => StringValueObjects.Is(typeToConvert);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(typeof(StringValueObjectJsonConverter<>).MakeGenericType(typeToConvert))!;
}

internal sealed class StringValueObjectJsonConverter<T> : JsonConverter<T>
    where T : class, IStringValueObject<T>
{
    // The message reaches the user and the logs as is, so it never carries the value (personal data).
    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException(T.InvalidMessage);
        }

        var text = reader.GetString();

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        return T.TryParse(text, null, out var value) ? value : throw new JsonException(T.InvalidMessage);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Value);
    }
}
