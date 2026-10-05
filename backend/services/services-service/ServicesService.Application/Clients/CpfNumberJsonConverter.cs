using System.Text.Json;
using System.Text.Json.Serialization;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public sealed class CpfNumberJsonConverter : JsonConverter<CpfNumber>
{
    // The message reaches the user and the logs as is, so it never carries the CPF (personal data).
    public override CpfNumber? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException(CpfNumber.Invalid.Message);
        }

        var result = CpfNumber.Create(reader.GetString());
        if (result.IsFailure)
        {
            throw new JsonException(result.Error.Message);
        }

        return result.Value;
    }

    public override void Write(Utf8JsonWriter writer, CpfNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Value);
    }
}
