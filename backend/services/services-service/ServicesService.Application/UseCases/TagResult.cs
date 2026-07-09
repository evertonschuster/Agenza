using ServicesService.Domain.Entities;

namespace ServicesService.Application.UseCases;

/// <summary>
/// The application-layer view of a Tag returned by every tag use case -
/// the Api serializes this 1:1 as the TagDto from the frontend's
/// docs/API.md contract.
/// </summary>
public record TagResult(Guid Id, string Name, string Color, string? Description)
{
    public static TagResult FromTag(Tag tag) =>
        new(tag.Id, tag.Name, tag.Color.Value, tag.Description);
}
