using System.Text.Json;
using Admin.SharedKernel;

namespace ServicesService.Tests;

internal static class WireJson
{
    public static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web).AddValueObjectConverters();
}
