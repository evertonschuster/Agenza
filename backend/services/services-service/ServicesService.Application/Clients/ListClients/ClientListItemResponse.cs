using ServicesService.Application.Tags;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ClientListItemResponse(
    Guid Id,
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    string? Cpf,
    ClientStatus Status,
    IReadOnlyList<TagSummary> Tags)
{
    public static ClientListItemResponse FromClient(Client client, IReadOnlyDictionary<Guid, Tag> tagsById)
    {
        var clientTags = client.Tags
            .Select(clientTag => tagsById.GetValueOrDefault(clientTag.TagId))
            .OfType<Tag>()
            .OrderBy(tag => tag.Name)
            .ThenBy(tag => tag.Id)
            .Select(TagSummary.FromTag)
            .ToList();

        return new ClientListItemResponse(
            client.Id,
            client.FullName.Value,
            client.BirthDate?.Value,
            client.Phone?.Value,
            client.Email?.Value,
            client.Cpf?.Value,
            client.Status,
            clientTags);
    }
}
