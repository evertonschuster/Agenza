using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.DeactivateClient;

public sealed record DeactivateClientCommand(
    [property: Description("ID do cliente a desativar, em formato UUID. Use o valor do campo id retornado por list_clients ou get_client_by_id.")]
    Guid ClientId) : ICommand<ClientResponse>;
