using ServicesService.Domain.Entities;

namespace ServicesService.Application.Tags;

/// <summary>
/// Shared across every Tags command/query - the Api serializes this 1:1
/// as the TagDto from the frontend's docs/API.md contract.
/// </summary>
public sealed record TagResponse(Guid Id, string Name, string Color, string? Description)
{
    public static TagResponse FromTag(Tag tag) =>
        new(tag.Id, tag.Name, tag.Color.Value, tag.Description);
}
