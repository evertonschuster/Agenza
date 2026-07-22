using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

// Fixed 8-color palette (frontend docs/API.md) - not a free-form hex value.
// Palette membership is also checked in CreateTagCommandValidator/UpdateTagCommandValidator
// (cheap, data-only shape rule) - this is defense-in-depth for a genuine domain invariant
// (docs/adr/0011-revert in docs/adr/0012).
public sealed record TagColor
{
    public static readonly IReadOnlyList<string> Palette =
    [
        "#0d9488", // teal
        "#0ea5e9", // sky
        "#8b5cf6", // violet
        "#ec4899", // pink
        "#ef4444", // red
        "#f59e0b", // amber
        "#22c55e", // green
        "#64748b", // slate
    ];

    public string Value { get; }

    private TagColor(string value)
    {
        Value = value;
    }

    public static DomainResult<TagColor> Create(string value)
    {
        var normalized = value?.Trim().ToLowerInvariant() ?? string.Empty;

        if (!Palette.Contains(normalized))
        {
            return DomainResult.Failure<TagColor>(new DomainError(
                "Tag.Invalid",
                $"A cor da etiqueta deve ser um dos valores da paleta: {string.Join(", ", Palette)}."));
        }

        return DomainResult.Success(new TagColor(normalized));
    }
}
