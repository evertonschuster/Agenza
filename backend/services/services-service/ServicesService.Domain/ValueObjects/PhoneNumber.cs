using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record PhoneNumber
{
    public const int MaxLength = 20;

    public static readonly DomainError Invalid = new(
        "PhoneNumber.Invalid",
        $"O telefone deve ter no máximo {MaxLength} caracteres, entre dígitos, espaços, +, parênteses e hífen.");

    public string Value { get; }

    private PhoneNumber(string value)
    {
        Value = value;
    }

    public static DomainResult<PhoneNumber?> Create(string? raw)
    {
        var trimmed = raw?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<PhoneNumber?>(null);
        }

        if (!HasValidShape(trimmed))
        {
            return DomainResult.Failure<PhoneNumber?>(Invalid);
        }

        return DomainResult.Success<PhoneNumber?>(new PhoneNumber(trimmed));
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
