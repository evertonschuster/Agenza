namespace Admin.SharedKernel.ValueObjects;

public sealed record CpfNumber : IStringValueObject<CpfNumber>
{
    public const int Length = 11;

    private const string InvalidMessage = "O CPF informado é inválido.";

    public string Value { get; }

    private CpfNumber(string value)
    {
        Value = value;
    }

    public static ParseResult<CpfNumber> Create(string? raw)
    {
        var digits = StripMask(raw ?? string.Empty);

        if (!HasValidCheckDigits(digits))
        {
            return ParseResult<CpfNumber>.Failure(InvalidMessage);
        }

        return ParseResult<CpfNumber>.Success(new CpfNumber(digits));
    }

    public static CpfNumber Restore(string value)
    {
        return new CpfNumber(value);
    }

    private static string StripMask(string value) =>
        new(value.Where(character => character is not ('.' or '-') && !char.IsWhiteSpace(character)).ToArray());

    private static bool HasValidCheckDigits(string digits)
    {
        if (digits.Length != Length || !digits.All(char.IsAsciiDigit) || digits.Distinct().Count() == 1)
        {
            return false;
        }

        return digits[9] - '0' == CheckDigit(digits, 9) && digits[10] - '0' == CheckDigit(digits, 10);
    }

    private static int CheckDigit(string digits, int length)
    {
        var sum = 0;
        for (var index = 0; index < length; index++)
        {
            sum += (digits[index] - '0') * (length + 1 - index);
        }

        var remainder = sum * 10 % 11;
        return remainder == 10 ? 0 : remainder;
    }
}
