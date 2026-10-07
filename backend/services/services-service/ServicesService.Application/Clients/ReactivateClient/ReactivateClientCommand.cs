using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ReactivateClient;

public sealed record ReactivateClientCommand(Guid ClientId) : ICommand<ClientResponse>;
