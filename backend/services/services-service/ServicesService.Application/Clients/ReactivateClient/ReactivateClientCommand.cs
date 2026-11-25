using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ReactivateClient;

public sealed record ReactivateClientCommand(
    [property: Description("ID do cliente a reativar, em formato UUID. Use o valor do campo id retornado por list_clients ou get_client_by_id.")]
    Guid ClientId) : ICommand<ClientResponse>;
