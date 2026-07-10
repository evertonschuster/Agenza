using Admin.SharedKernel;

namespace ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

public sealed record UpdateServiceOfferingCommand(
    Guid ServiceOfferingId,
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price) : ICommand<ServiceOfferingResponse>;
