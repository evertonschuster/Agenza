using System.Text.Json;
using System.Text.Json.Serialization;

namespace ServicesService.Application.Services;

public sealed class ServiceModalityJsonConverter : JsonConverter<ServiceModality>
{
    private const string BothRequired = "Informe se o serviço atende presencialmente e se atende online.";

    public override ServiceModality? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var wire = JsonSerializer.Deserialize<Wire>(ref reader, options)!;

        if (wire.AttendsInPerson is not { } attendsInPerson || wire.AttendsOnline is not { } attendsOnline)
        {
            throw new JsonException(BothRequired);
        }

        var result = ServiceModality.Create(attendsInPerson, attendsOnline);

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error.Message);
    }

    public override void Write(Utf8JsonWriter writer, ServiceModality value, JsonSerializerOptions options) =>
        JsonSerializer.Serialize(writer, new Wire(value.AttendsInPerson, value.AttendsOnline), options);

    internal sealed record Wire(bool? AttendsInPerson, bool? AttendsOnline);
}
