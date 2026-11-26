using System.Text.Json.Serialization;
using Admin.SharedKernel;

namespace ServicesService.Application.Services.UpdateService;

public sealed record UpdateServiceCommand(
    Guid ServiceId,
    string Name,
    string? Description,
    int DurationMinutes,
    int MinDurationMinutes,
    int MaxDurationMinutes,
    decimal Price,
    decimal MaxDiscountPercentage,
    Guid? CategoryId,
    IReadOnlyList<Guid>? TagIds,
    [property: JsonConverter(typeof(ServiceModalityJsonConverter))] ServiceModality? Modality = null) : ICommand<ServiceResponse>;
