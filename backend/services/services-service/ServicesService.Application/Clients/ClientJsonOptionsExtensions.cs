using System.Text.Json;
using System.Text.Json.Serialization;

namespace ServicesService.Application.Clients;

public static class ClientJsonOptionsExtensions
{
    public static JsonSerializerOptions AddClientEnumConverters(this JsonSerializerOptions options)
    {
        options.Converters.Add(new JsonStringEnumConverter<ContactPurpose>(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        return options;
    }
}
