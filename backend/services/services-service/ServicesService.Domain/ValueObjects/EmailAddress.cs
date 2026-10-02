using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public static class EmailAddress
{
    public const int MaxLength = 254;

    public static DomainResult<string?> Normalize(string? raw)
    {
        var normalized = raw?.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(normalized))
        {
            return DomainResult.Success<string?>(null);
        }

        if (!HasValidShape(normalized))
        {
            return DomainResult.Failure<string?>(new DomainError(
                "Client.Invalid",
                $"O e-mail informado é inválido ou tem mais de {MaxLength} caracteres."));
        }

        return DomainResult.Success<string?>(normalized);
    }

    public static bool HasValidShape(string value)
    {
        if (value.Length > MaxLength || value.Any(char.IsWhiteSpace))
        {
            return false;
        }

        var parts = value.Split('@');
        if (parts is not [{ Length: > 0 }, var domain])
        {
            return false;
        }

        var labels = domain.Split('.');
        return labels.Length >= 2 && labels.All(label => label.Length > 0);
    }
}
