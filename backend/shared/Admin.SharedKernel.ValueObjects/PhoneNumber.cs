namespace Admin.SharedKernel.ValueObjects;

public sealed record PhoneNumber : IStringValueObject<PhoneNumber>
{
    public const int MaxLength = 20;

    private static readonly string InvalidMessage =
        $"Informe um telefone válido, com até {MaxLength} caracteres entre dígitos, espaços, +, parênteses e hífen.";

    public string Value { get; }

    private PhoneNumber(string value)
    {
        Value = value;
    }

    public static ParseResult<PhoneNumber> Create(string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;

        if (!HasValidShape(trimmed))
        {
            return ParseResult<PhoneNumber>.Failure(InvalidMessage);
        }

        return ParseResult<PhoneNumber>.Success(new PhoneNumber(trimmed));
    }

    public static PhoneNumber Restore(string value)
    {
        return new PhoneNumber(value);
    }

    private static bool HasValidShape(string value)
    {
        if (value.Length > MaxLength || !value.Any(char.IsAsciiDigit))
        {
            return false;
        }

        return value.All(character => char.IsAsciiDigit(character) || character is ' ' or '+' or '(' or ')' or '-');
    }
}
