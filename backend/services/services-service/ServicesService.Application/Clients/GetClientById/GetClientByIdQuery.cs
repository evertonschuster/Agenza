using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.GetClientById;

public sealed record GetClientByIdQuery(
    [property: Description("ID do cliente em formato UUID. Use o valor do campo id retornado por list_clients.")]
    Guid ClientId) : IQuery<ClientResponse>;
