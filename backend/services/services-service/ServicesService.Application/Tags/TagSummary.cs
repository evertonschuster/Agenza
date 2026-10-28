namespace ServicesService.Application.Tags;

public sealed record TagSummary(Guid Id, string Name, string Color)
{
    public static TagSummary FromTag(Tag tag) => new(tag.Id, tag.Name, tag.Color.Value);
}
