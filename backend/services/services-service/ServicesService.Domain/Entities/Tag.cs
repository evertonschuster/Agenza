using ServicesService.Domain.Common;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateTag/UpdateTag use cases via ITagRepository, not here.
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
        Name = ValidateName(name);
        Color = color;
        Description = ValidateDescription(description);
    }

    public void Update(string name, TagColor color, string? description)
    {
        // Validate every new value before assigning anything, so a later
        // validation failure (e.g. an over-length description) can never
        // leave the entity with some fields already overwritten.
        var validatedName = ValidateName(name);
        var validatedDescription = ValidateDescription(description);

        Name = validatedName;
        Color = color;
        Description = validatedDescription;
    }

    private static string ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            throw new InvalidTagException(
                $"O nome da etiqueta é obrigatório e deve ter no máximo {NameMaxLength} caracteres.");
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
                $"A descrição da etiqueta deve ter no máximo {DescriptionMaxLength} caracteres.");
        }

        return trimmed;
    }
}
