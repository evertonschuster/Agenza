using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.DeactivateClient;

public sealed record DeactivateClientCommand(
    [property: Description("ID do cliente a desativar, em formato UUID. Use o valor do campo id do cliente.")]
    Guid ClientId) : ICommand<ClientResponse>;
