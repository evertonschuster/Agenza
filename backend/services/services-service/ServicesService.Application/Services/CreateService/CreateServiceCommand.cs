using Admin.SharedKernel;

namespace ServicesService.Application.Services.CreateService;

public sealed record CreateServiceCommand(
    string Name,
    string? Description,
    int DurationMinutes,
    int MinDurationMinutes,
    int MaxDurationMinutes,
    decimal Price,
    decimal MaxDiscountPercentage,
    Guid? CategoryId,
    IReadOnlyList<Guid>? TagIds) : ICommand<ServiceResponse>;
