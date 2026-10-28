using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.ListClients;

public sealed class ListClientsQueryHandler(IClientRepository clientRepository, ITagRepository tagRepository) : IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>
{
    public async Task<Result<PagedResult<ClientListItemResponse>>> Handle(ListClientsQuery query, CancellationToken cancellationToken)
    {
        var clientFilter = query.ToFilter();
        var clients = await clientRepository.ListAsync(clientFilter, cancellationToken);

        var tagIds = clients.Items.SelectMany(client => client.Tags).Select(clientTag => clientTag.TagId).Distinct().ToList();
        var tags = await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
        var tagsById = tags.ToDictionary(tag => tag.Id);

        return Result.Success(clients.Map(client => ClientListItemResponse.FromClient(client, tagsById)));
    }
}
