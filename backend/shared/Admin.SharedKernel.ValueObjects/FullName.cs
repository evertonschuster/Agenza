namespace Admin.SharedKernel.ValueObjects;

public sealed record FullName : IStringValueObject<FullName>
{
    public const int MinLength = 2;
    public const int MaxLength = 150;

    public static bool BlankIsAbsent => false;

    public string Value { get; }

    private FullName(string value)
    {
        Value = value;
    }

    public static ParseResult<FullName> Create(string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return ParseResult<FullName>.Failure("O nome completo é obrigatório.");
        }

        if (trimmed.Length < MinLength)
        {
            return ParseResult<FullName>.Failure($"O nome completo deve ter pelo menos {MinLength} caracteres.");
        }

        if (trimmed.Length > MaxLength)
        {
            return ParseResult<FullName>.Failure($"O nome completo deve ter no máximo {MaxLength} caracteres.");
        }

        return ParseResult<FullName>.Success(new FullName(trimmed));
    }

    public static FullName Restore(string value)
    {
        return new FullName(value);
    }
}
