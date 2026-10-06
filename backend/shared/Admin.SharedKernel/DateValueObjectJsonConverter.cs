using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

internal sealed class DateValueObjectJsonConverter<T>(TimeProvider timeProvider) : JsonConverter<T>
    where T : class, IDateValueObject<T>
{
    // Reading the date itself is the framework's job, so a malformed date answers as it always did.
    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var date = DateConverter(options).Read(ref reader, typeof(DateOnly), options);
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var result = T.Create(date, today);

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        DateConverter(options).Write(writer, value.Value, options);
    }

    private static JsonConverter<DateOnly> DateConverter(JsonSerializerOptions options) =>
        (JsonConverter<DateOnly>)options.GetConverter(typeof(DateOnly));
}
