using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

internal sealed class ObjectValueObjectJsonConverter<T, TInput> : JsonConverter<T>
    where T : class, IObjectValueObject<T, TInput>
{
    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var input = JsonSerializer.Deserialize<TInput>(ref reader, options)!;
        var result = T.Create(input);

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, T.ToInput(value), options);
    }
}
