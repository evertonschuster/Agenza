using Admin.SharedKernel;

namespace ServicesService.Application.ServiceOfferings.CreateServiceOffering;

public sealed record CreateServiceOfferingCommand(
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price) : ICommand<ServiceOfferingResponse>;
