using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ReactivateClient;

public sealed record ReactivateClientCommand(
    [property: Description("ID do cliente a reativar, em formato UUID. Use o valor do campo id do cliente.")]
    Guid ClientId) : ICommand<ClientResponse>;
