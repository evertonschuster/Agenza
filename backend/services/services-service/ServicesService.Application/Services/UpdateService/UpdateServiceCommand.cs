using Admin.SharedKernel;

namespace ServicesService.Application.Services.UpdateService;

public sealed record UpdateServiceCommand(
    Guid ServiceId,
    string Name,
    Guid? CategoryId,
    IReadOnlyList<Guid>? TagIds,
    string? InternalDescription,
    string? ClientDescription,
    int DurationMinutes,
    int? PreparationMinutes,
    int? CleanupMinutes,
    int? MinDurationMinutes,
    int? MaxDurationMinutes,
    string PricingType,
    decimal? Price,
    decimal? MaxDiscountPercentage) : ICommand<ServiceResponse>;
