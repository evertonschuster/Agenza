namespace Admin.SharedKernel.ValueObjects;

public sealed record EmailAddress : IStringValueObject<EmailAddress>
{
    public const int MaxLength = 254;

    private static readonly string TooLong = $"O e-mail deve ter no máximo {MaxLength} caracteres.";

    private const string InvalidFormat = "Informe um e-mail válido.";

    public string Value { get; }

    private EmailAddress(string value)
    {
        Value = value;
    }

    public static ParseResult<EmailAddress> Create(string? raw)
    {
        var normalized = raw?.Trim().ToLowerInvariant() ?? string.Empty;

        if (normalized.Length > MaxLength)
        {
            return ParseResult<EmailAddress>.Failure(TooLong);
        }

        if (!HasValidShape(normalized))
        {
            return ParseResult<EmailAddress>.Failure(InvalidFormat);
        }

        return ParseResult<EmailAddress>.Success(new EmailAddress(normalized));
    }

    public static EmailAddress Restore(string value)
    {
        return new EmailAddress(value);
    }

    private static bool HasValidShape(string value)
    {
        if (value.Any(char.IsWhiteSpace))
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
