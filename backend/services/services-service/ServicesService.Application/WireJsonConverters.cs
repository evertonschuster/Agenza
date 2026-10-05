using System.Text.Json;
using Admin.SharedKernel;
using ServicesService.Application.Clients;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application;

public static class WireJsonConverters
{
    public static IReadOnlyList<FieldError> KnownErrors { get; } =
    [
        new FieldError(CpfNumber.Invalid.Code, CpfNumber.Invalid.Message),
    ];

    public static void AddTo(JsonSerializerOptions options)
    {
        options.Converters.Add(new CpfNumberJsonConverter());
    }
}
