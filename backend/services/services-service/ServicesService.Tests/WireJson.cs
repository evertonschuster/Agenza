using System.Text.Json;
using ServicesService.Application;

namespace ServicesService.Tests;

internal static class WireJson
{
    public static readonly JsonSerializerOptions Options = Create();

    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        WireJsonConverters.AddTo(options);
        return options;
    }
}
