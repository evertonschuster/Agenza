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
    IReadOnlyList<Guid>? TagIds) : ICommand<ServiceResponse>;
