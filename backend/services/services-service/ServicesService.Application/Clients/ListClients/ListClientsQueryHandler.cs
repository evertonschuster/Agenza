using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.ListClients;

public sealed class ListClientsQueryHandler(IClientRepository clientRepository)
    : IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>
{
    public async Task<Result<PagedResult<ClientListItemResponse>>> Handle(
        ListClientsQuery query,
        CancellationToken cancellationToken)
    {
        var status = ToStatusFilter(query.Status);

        var filter = ClientListFilter.Create(query.Page, query.PageSize, query.Search, status);

        var clients = await clientRepository.ListAsync(filter, cancellationToken);

        return Result.Success(clients.Map(ClientListItemResponse.FromClient));
    }

    private static ClientStatus? ToStatusFilter(ClientStatusFilter? status)
    {
        if (status == ClientStatusFilter.All)
        {
            return null;
        }

        if (status == ClientStatusFilter.Inactive)
        {
            return ClientStatus.Inactive;
        }

        return ClientStatus.Active;
    }
}
