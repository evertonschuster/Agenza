using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    int Page = PageRequest.FirstPage,
    int PageSize = PageRequest.DefaultPageSize,
    string? Q = null,
    ClientStatusFilter? Status = ClientStatusFilter.Active) : IQuery<PagedResult<ClientListItemResponse>>;
