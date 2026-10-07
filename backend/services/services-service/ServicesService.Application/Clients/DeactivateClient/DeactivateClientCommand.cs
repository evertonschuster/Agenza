using Admin.SharedKernel;

namespace ServicesService.Application.Clients.DeactivateClient;

public sealed record DeactivateClientCommand(Guid ClientId) : ICommand<ClientResponse>;
