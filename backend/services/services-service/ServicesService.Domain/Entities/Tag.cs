using ServicesService.Domain.Common;
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

    private Tag(Guid id, string name, TagColor color, string? description)
        : base(id)
    {
        Name = name;
        Color = color;
        Description = description;
    }

    public static DomainResult<Tag> Create(Guid id, string name, TagColor color, string? description)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<Tag>(nameResult.Error);
        }

        var descriptionResult = ValidateDescription(description);
        if (descriptionResult.IsFailure)
        {
            return DomainResult.Failure<Tag>(descriptionResult.Error);
        }

        return DomainResult.Success(new Tag(id, nameResult.Value, color, descriptionResult.Value));
    }

    public DomainResult Update(string name, TagColor color, string? description)
    {
        // Validate every new value before assigning anything, so a later
        // validation failure (e.g. an over-length description) can never
        // leave the entity with some fields already overwritten.
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure(nameResult.Error);
        }

        var descriptionResult = ValidateDescription(description);
        if (descriptionResult.IsFailure)
        {
            return DomainResult.Failure(descriptionResult.Error);
        }

        Name = nameResult.Value;
        Color = color;
        Description = descriptionResult.Value;

        return DomainResult.Success();
    }

    private static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Tag.Invalid",
                $"O nome da etiqueta é obrigatório e deve ter no máximo {NameMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }

    private static DomainResult<string?> ValidateDescription(string? description)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (trimmed.Length > DescriptionMaxLength)
        {
            return DomainResult.Failure<string?>(new DomainError(
                "Tag.Invalid",
                $"A descrição da etiqueta deve ter no máximo {DescriptionMaxLength} caracteres."));
        }

        return DomainResult.Success<string?>(trimmed);
    }
}
