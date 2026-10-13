using System.ComponentModel;

namespace Admin.SharedKernel.ValueObjects;

[TypeConverter(typeof(StringValueObjectTypeConverter<SearchText>))]
public sealed record SearchText : IStringValueObject<SearchText>
{
    public const int MaxLength = 254;

    private static readonly string TooLong = $"A busca deve ter no máximo {MaxLength} caracteres.";

    public string Value { get; }

    public bool IsEmpty => Value.Length == 0;

    private SearchText(string value)
    {
        Value = value;
    }

    public static ParseResult<SearchText> Create(string? raw)
    {
        var normalized = raw?.Trim().ToLowerInvariant() ?? string.Empty;

        if (normalized.Length > MaxLength)
        {
            return ParseResult<SearchText>.Failure(TooLong);
        }

        return ParseResult<SearchText>.Success(new SearchText(normalized));
    }

    public static SearchText Restore(string value)
    {
        return new SearchText(value);
    }
}
