using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.GetClientById;

public sealed class GetClientByIdQueryHandler(IClientRepository clientRepository, ITagRepository tagRepository)
    : IQueryHandler<GetClientByIdQuery, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(GetClientByIdQuery query, CancellationToken cancellationToken)
    {
        var client = await clientRepository.GetByIdAsync(query.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure<ClientResponse>(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        var tags = await GetTagsAsync(client, cancellationToken);

        return ClientResponse.FromClient(client, tags);
    }

    private async Task<IReadOnlyList<Tag>> GetTagsAsync(Client client, CancellationToken cancellationToken)
    {
        var tagIds = client.Tags
            .Select(clientTag => clientTag.TagId)
            .ToList();

        return await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
    }
}
