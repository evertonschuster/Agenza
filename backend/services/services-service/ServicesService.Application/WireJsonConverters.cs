using System.Text.Json;
using ServicesService.Application.Clients;

namespace ServicesService.Application;

public static class WireJsonConverters
{
    public static void AddTo(JsonSerializerOptions options)
    {
        options.Converters.Add(new CpfNumberJsonConverter());
    }
}
