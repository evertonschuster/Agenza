using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record FullName
{
    public const int MinLength = 2;
    public const int MaxLength = 150;

    public string Value { get; }

    private FullName(string value)
    {
        Value = value;
    }

    public static DomainResult<FullName> Create(string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;

        if (trimmed.Length < MinLength || trimmed.Length > MaxLength)
        {
            return DomainResult.Failure<FullName>(new DomainError(
                "Client.Invalid",
                $"O nome completo é obrigatório e deve ter entre {MinLength} e {MaxLength} caracteres."));
        }

        return DomainResult.Success(new FullName(trimmed));
    }
}
