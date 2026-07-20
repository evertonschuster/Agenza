using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateTag/UpdateTag use cases via ITagRepository, not here.
// All shape/invariant validation lives in CreateTagCommandValidator/UpdateTagCommandValidator (docs/adr/0011) - this entity trusts its inputs.
public class Tag : TenantOwnedEntity
{
    public const int NameMaxLength = 40;
    public const int DescriptionMaxLength = 200;

    public string Name { get; private set; }
    public TagColor Color { get; private set; }
    public string? Description { get; private set; }

    // EF Core materialization only.
    private Tag()
    {
        Name = string.Empty;
        Color = null!;
    }

    public Tag(Guid id, string name, TagColor color, string? description)
        : base(id)
    {
        Name = name.Trim();
        Color = color;
        Description = NormalizeDescription(description);
    }

    public void Update(string name, TagColor color, string? description)
    {
        Name = name.Trim();
        Color = color;
        Description = NormalizeDescription(description);
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
