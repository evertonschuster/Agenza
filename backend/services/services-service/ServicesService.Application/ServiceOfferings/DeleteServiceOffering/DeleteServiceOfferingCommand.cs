using Admin.SharedKernel;

namespace ServicesService.Application.ServiceOfferings.DeleteServiceOffering;

public sealed record DeleteServiceOfferingCommand(Guid ServiceOfferingId) : ICommand;
