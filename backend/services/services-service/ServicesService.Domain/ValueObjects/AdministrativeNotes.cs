using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record AdministrativeNotes
{
    public const int MaxLength = 500;

    public static readonly DomainError TooLong = new(
        "AdministrativeNotes.TooLong",
        $"As observações administrativas devem ter no máximo {MaxLength} caracteres.");

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
            return DomainResult.Failure<AdministrativeNotes?>(TooLong);
        }

        return DomainResult.Success<AdministrativeNotes?>(new AdministrativeNotes(trimmed));
    }
}
