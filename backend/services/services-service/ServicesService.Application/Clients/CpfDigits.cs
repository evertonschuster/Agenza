namespace ServicesService.Application.Clients;

public sealed record CpfDigits
{
    private CpfDigits(string value)
    {
        Value = value;
    }

    public string Value { get; }

    public static CpfDigits? Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var digits = new string(raw.Where(character => character is not ('.' or '-') && !char.IsWhiteSpace(character)).ToArray());
        if (digits.Length == 0 || digits.Length > CpfNumber.Length || !digits.All(char.IsAsciiDigit))
        {
            return null;
        }

        return new CpfDigits(digits);
    }
}
