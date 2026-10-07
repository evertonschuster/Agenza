using System.Text.Json;
using Admin.SharedKernel;
using ServicesService.Tests.Clients;

namespace ServicesService.Tests;

internal static class WireJson
{
    public static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions(JsonSerializerDefaults.Web)
            .AddValueObjectConverters(new FixedTimeProvider(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero)))
            .AddEnumNameConverter();
}
