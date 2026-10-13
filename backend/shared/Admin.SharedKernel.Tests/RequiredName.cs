using System.ComponentModel;

namespace Admin.SharedKernel.Tests;

[TypeConverter(typeof(StringValueObjectTypeConverter<RequiredName>))]
public sealed record RequiredName : IStringValueObject<RequiredName>
{
    public const int MaxLength = 5;

    public static bool BlankIsAbsent => false;

    public string Value { get; }

    private RequiredName(string value)
    {
        Value = value;
    }

    public static ParseResult<RequiredName> Create(string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return ParseResult<RequiredName>.Failure("O nome é obrigatório.");
        }

        if (trimmed.Length > MaxLength)
        {
            return ParseResult<RequiredName>.Failure("O nome deve ter no máximo 5 caracteres.");
        }

        return ParseResult<RequiredName>.Success(new RequiredName(trimmed));
    }

    public static RequiredName Restore(string value)
    {
        return new RequiredName(value);
    }
}
