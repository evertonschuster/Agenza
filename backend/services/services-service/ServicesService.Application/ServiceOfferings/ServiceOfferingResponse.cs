using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings;

public sealed record ServiceOfferingResponse(
    Guid Id,
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price)
{
    public static ServiceOfferingResponse FromServiceOffering(ServiceOffering serviceOffering) =>
        new(serviceOffering.Id, serviceOffering.Name, serviceOffering.Description,
            serviceOffering.DurationMinutes, serviceOffering.Price);
}
