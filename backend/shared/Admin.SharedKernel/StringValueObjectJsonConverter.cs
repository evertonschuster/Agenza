using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

internal sealed class StringValueObjectJsonConverter<T> : JsonConverter<T>
    where T : class, IStringValueObject<T>
{
    // The message reaches the user and the logs as is: a value object's error never carries the value (personal data).
    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException(NotText());
        }

        var text = reader.GetString();

        if (string.IsNullOrWhiteSpace(text))
        {
            if (T.BlankIsAbsent)
            {
                return null;
            }

            throw new JsonException(T.Create(text).Error);
        }

        var result = T.Create(text);

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    private static string NotText()
    {
        var result = T.Create(null);
        if (result.IsFailure)
        {
            return result.Error;
        }

        return "O valor informado deve ser um texto.";
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Value);
    }
}
