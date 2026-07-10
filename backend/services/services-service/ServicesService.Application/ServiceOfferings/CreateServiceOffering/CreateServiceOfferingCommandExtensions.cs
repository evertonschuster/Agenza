using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings.CreateServiceOffering;

public static class CreateServiceOfferingCommandExtensions
{
    public static ServiceOffering ToModel(this CreateServiceOfferingCommand command) =>
        new(Guid.CreateVersion7(), command.Name, command.Description, command.DurationMinutes, command.Price);
}
