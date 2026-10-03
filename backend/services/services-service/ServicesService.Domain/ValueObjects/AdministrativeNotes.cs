using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record AdministrativeNotes
{
    public const int MaxLength = 500;

    public string Value { get; }

    private AdministrativeNotes(string value)
    {
        Value = value;
    }

    public static DomainResult<AdministrativeNotes?> Create(string? raw)
    {
        var trimmed = raw?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<AdministrativeNotes?>(null);
        }

        if (trimmed.Length > MaxLength)
        {
            return DomainResult.Failure<AdministrativeNotes?>(new DomainError(
                "Client.Invalid",
                $"As observações administrativas devem ter no máximo {MaxLength} caracteres."));
        }

        return DomainResult.Success<AdministrativeNotes?>(new AdministrativeNotes(trimmed));
    }
}
