using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.ValueObjects;

/// <summary>
/// A tag's display color. Not a free-form hex value: the product decision
/// (frontend docs/API.md) is a fixed 8-color palette so tags stay visually
/// consistent, so the only valid values are the palette entries below.
/// Record semantics give value equality by hex string.
/// </summary>
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

    public static TagColor From(string value)
    {
        var normalized = value?.Trim().ToLowerInvariant() ?? string.Empty;

        if (!Palette.Contains(normalized))
        {
            throw new InvalidTagException(
                $"Tag color must be one of the palette values: {string.Join(", ", Palette)}.");
        }

        return new TagColor(normalized);
    }
}
