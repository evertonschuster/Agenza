using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.SharedKernel;
using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public sealed class CpfNumberJsonConverter : JsonConverter<CpfNumber>
{
    // The message reaches the user and the logs as is, so it never carries the CPF (personal data).
    public override CpfNumber? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException(Encode(CpfNumber.Invalid));
        }

        var result = CpfNumber.Create(reader.GetString());
        if (result.IsFailure)
        {
            throw new JsonException(Encode(result.Error));
        }

        return result.Value;
    }

    public override void Write(Utf8JsonWriter writer, CpfNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Value);
    }

    private static string Encode(DomainError error)
    {
        return WireErrorText.Encode(error.Code, error.Message);
    }
}
