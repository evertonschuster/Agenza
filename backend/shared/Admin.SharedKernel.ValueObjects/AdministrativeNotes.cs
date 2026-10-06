namespace Admin.SharedKernel.ValueObjects;

public sealed record AdministrativeNotes : IStringValueObject<AdministrativeNotes>
{
    public const int MaxLength = 500;

    private static readonly string NotText =
        $"As observações administrativas devem ser um texto de até {MaxLength} caracteres.";

    private static readonly string TooLong =
        $"As observações administrativas devem ter no máximo {MaxLength} caracteres.";

    public string Value { get; }

    private AdministrativeNotes(string value)
    {
        Value = value;
    }

    public static ParseResult<AdministrativeNotes> Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return ParseResult<AdministrativeNotes>.Failure(NotText);
        }

        var trimmed = raw.Trim();

        if (trimmed.Length > MaxLength)
        {
            return ParseResult<AdministrativeNotes>.Failure(TooLong);
        }

        return ParseResult<AdministrativeNotes>.Success(new AdministrativeNotes(trimmed));
    }

    public static AdministrativeNotes Restore(string value)
    {
        return new AdministrativeNotes(value);
    }
}
