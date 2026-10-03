using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record EmailAddress
{
    public const int MaxLength = 254;

    public string Value { get; }

    private EmailAddress(string value)
    {
        Value = value;
    }

    public static DomainResult<EmailAddress?> Create(string? raw)
    {
        var normalized = raw?.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(normalized))
        {
            return DomainResult.Success<EmailAddress?>(null);
        }

        if (!HasValidShape(normalized))
        {
            return DomainResult.Failure<EmailAddress?>(new DomainError(
                "Client.Invalid",
                $"O e-mail informado é inválido ou tem mais de {MaxLength} caracteres."));
        }

        return DomainResult.Success<EmailAddress?>(new EmailAddress(normalized));
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
