using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

public static class UpdateServiceOfferingCommandExtensions
{
    public static void ApplyTo(this UpdateServiceOfferingCommand command, ServiceOffering serviceOffering) =>
        serviceOffering.Update(command.Name, command.Description, command.DurationMinutes, command.Price);
}
