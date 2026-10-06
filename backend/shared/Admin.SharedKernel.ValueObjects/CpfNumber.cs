using System.Diagnostics.CodeAnalysis;

namespace Admin.SharedKernel.ValueObjects;

public sealed record CpfNumber : IStringValueObject<CpfNumber>
{
    public const int Length = 11;

    public static string InvalidMessage => "O CPF informado é inválido.";

    public string Value { get; }

    private CpfNumber(string value)
    {
        Value = value;
    }

    public static CpfNumber Parse(string s, IFormatProvider? provider)
    {
        return TryParse(s, provider, out var result) ? result : throw new FormatException(InvalidMessage);
    }

    public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, [MaybeNullWhen(false)] out CpfNumber result)
    {
        result = null;

        if (string.IsNullOrWhiteSpace(s))
        {
            return false;
        }

        var digits = StripMask(s);

        if (!HasValidCheckDigits(digits))
        {
            return false;
        }

        result = new CpfNumber(digits);
        return true;
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
