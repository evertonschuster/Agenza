using Admin.SharedKernel;

namespace ServicesService.Application.Clients.GetClientById;

public sealed record GetClientByIdQuery(Guid ClientId) : IQuery<ClientResponse>;
