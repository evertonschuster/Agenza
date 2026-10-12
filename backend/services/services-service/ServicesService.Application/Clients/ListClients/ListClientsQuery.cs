using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Q = null,
    string? Status = ListClientsQuery.ActiveStatus) : IQuery<PagedResult<ClientListItemResponse>>
{
    public const string ActiveStatus = "active";
    public const string InactiveStatus = "inactive";
    public const string AllStatus = "all";
}
