using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record FullName
{
    public const int MinLength = 2;
    public const int MaxLength = 150;

    public static readonly DomainError InvalidLength = new(
        "FullName.InvalidLength",
        $"O nome completo é obrigatório e deve ter entre {MinLength} e {MaxLength} caracteres.");

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
            return DomainResult.Failure<FullName>(InvalidLength);
        }

        return DomainResult.Success(new FullName(trimmed));
    }
}
