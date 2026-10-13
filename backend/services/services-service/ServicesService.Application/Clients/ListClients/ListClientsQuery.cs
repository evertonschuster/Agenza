using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    SearchText? Search = null,
    ClientStatusFilter? Status = ClientStatusFilter.Active) : PagedQuery, IQuery<PagedResult<ClientListItemResponse>>;
