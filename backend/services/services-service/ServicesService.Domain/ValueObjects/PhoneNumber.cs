using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public static class PhoneNumber
{
    public const int MaxLength = 20;

    public static DomainResult<string?> Normalize(string? raw)
    {
        var trimmed = raw?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (!HasValidShape(trimmed))
        {
            return DomainResult.Failure<string?>(new DomainError(
                "Client.Invalid",
                $"O telefone deve ter no máximo {MaxLength} caracteres, entre dígitos, espaços, +, parênteses e hífen."));
        }

        return DomainResult.Success<string?>(trimmed);
    }

    public static bool HasValidShape(string value) =>
        value.Length <= MaxLength
        && value.Any(char.IsAsciiDigit)
        && value.All(character => char.IsAsciiDigit(character) || character is ' ' or '+' or '(' or ')' or '-');
}
