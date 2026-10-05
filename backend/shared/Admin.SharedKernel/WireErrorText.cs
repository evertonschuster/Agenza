namespace Admin.SharedKernel;

public static class WireErrorText
{
    private const char Separator = '|';

    public static string Encode(string code, string message)
    {
        return $"{code}{Separator}{message}";
    }

    public static bool TryDecode(string text, out FieldError fieldError)
    {
        fieldError = default;

        var separator = text.IndexOf(Separator);
        if (separator <= 0)
        {
            return false;
        }

        var code = text[..separator];
        if (!IsCode(code))
        {
            return false;
        }

        fieldError = new FieldError(code, text[(separator + 1)..]);
        return true;
    }

    private static bool IsCode(string code)
    {
        if (!char.IsAsciiLetterUpper(code[0]) || code[^1] == '.' || code.Contains("..", StringComparison.Ordinal))
        {
            return false;
        }

        var hasDot = false;
        foreach (var character in code)
        {
            if (character == '.')
            {
                hasDot = true;
                continue;
            }

            if (!char.IsAsciiLetterOrDigit(character))
            {
                return false;
            }
        }

        return hasDot;
    }
}
