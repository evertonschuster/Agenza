using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients;

public static class TagRepositoryExtensions
{
    public static async Task<IReadOnlyList<Tag>> GetTagsOfAsync(this ITagRepository tagRepository, IEnumerable<Client> clients, CancellationToken cancellationToken)
    {
        var tagIds = clients.SelectMany(client => client.Tags).Select(clientTag => clientTag.TagId).Distinct().ToList();
        if (tagIds.Count == 0)
        {
            return [];
        }

        return await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
    }
}
