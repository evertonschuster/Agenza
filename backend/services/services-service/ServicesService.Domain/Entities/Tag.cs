using ServicesService.Domain.Common;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

/// <summary>
/// A tenant-scoped label the business defines to organize its records
/// (docs/DOMAIN.md "Tag"). v1 manages the tag catalog only; attaching
/// tags to clients/conversations ships with those verticals.
///
/// Name uniqueness per tenant is a cross-aggregate rule and therefore
/// lives in the CreateTag/UpdateTag use cases (via ITagRepository), not
/// here - this entity guards everything a single Tag can know about
/// itself.
/// </summary>
public class Tag : BaseEntity
{
    public const int NameMaxLength = 40;
    public const int DescriptionMaxLength = 200;

    public Guid TenantId { get; private set; }
    public string Name { get; private set; }
    public TagColor Color { get; private set; }
    public string? Description { get; private set; }

    // EF Core materialization only.
    private Tag()
    {
        Name = string.Empty;
        Color = null!;
    }

    public Tag(Guid id, Guid tenantId, string name, TagColor color, string? description)
        : base(id)
    {
        if (tenantId == Guid.Empty)
        {
            throw new InvalidTagException("A tag must belong to a tenant.");
        }

        TenantId = tenantId;
        Name = ValidateName(name);
        Color = color;
        Description = ValidateDescription(description);
    }

    public void Update(string name, TagColor color, string? description)
    {
        Name = ValidateName(name);
        Color = color;
        Description = ValidateDescription(description);
    }

    private static string ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            throw new InvalidTagException(
                $"Tag name is required and must be at most {NameMaxLength} characters.");
        }

        return trimmed;
    }

    private static string? ValidateDescription(string? description)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        if (trimmed.Length > DescriptionMaxLength)
        {
            throw new InvalidTagException(
                $"Tag description must be at most {DescriptionMaxLength} characters.");
        }

        return trimmed;
    }
}
