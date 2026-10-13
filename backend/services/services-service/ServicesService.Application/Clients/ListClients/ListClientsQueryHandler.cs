using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.ListClients;

public sealed class ListClientsQueryHandler(IClientRepository clientRepository) : IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>
{
    public async Task<Result<PagedResult<ClientListItemResponse>>> Handle(ListClientsQuery query, CancellationToken cancellationToken)
    {
        var clientFilter = query.ToFilter();
        var clients = await clientRepository.ListAsync(clientFilter, cancellationToken);

        return Result.Success(clients.Map(ClientListItemResponse.FromClient));
    }
}
