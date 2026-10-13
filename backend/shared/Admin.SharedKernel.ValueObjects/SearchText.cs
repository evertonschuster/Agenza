using System.ComponentModel;

namespace Admin.SharedKernel.ValueObjects;

[TypeConverter(typeof(StringValueObjectTypeConverter<SearchText>))]
public sealed record SearchText : IStringValueObject<SearchText>
{
    public const int MaxLength = 254;

    private const string NotText = "Informe um texto para a busca.";

    private static readonly string TooLong = $"A busca deve ter no máximo {MaxLength} caracteres.";

    public string Value { get; }

    private SearchText(string value)
    {
        Value = value;
    }

    public static ParseResult<SearchText> Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return ParseResult<SearchText>.Failure(NotText);
        }

        var normalized = raw.Trim().ToLowerInvariant();

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
