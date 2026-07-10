using ServicesService.Domain.Entities;

namespace ServicesService.Application.Tags;

public sealed record TagResponse(Guid Id, string Name, string Color, string? Description)
{
    public static TagResponse FromTag(Tag tag) =>
        new(tag.Id, tag.Name, tag.Color.Value, tag.Description);
}
