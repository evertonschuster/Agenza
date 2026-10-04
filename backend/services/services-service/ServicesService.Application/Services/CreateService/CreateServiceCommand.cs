using Admin.SharedKernel;

namespace ServicesService.Application.Services.CreateService;

public sealed record CreateServiceCommand(
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
