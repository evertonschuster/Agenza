using Admin.SharedKernel;

namespace ServicesService.Application.Clients;

public sealed record ClientListFilter : PageRequest
{
    private ClientListFilter(int page, int pageSize, string? text, string? cpfDigits, ClientStatus? status)
        : base(page, pageSize)
    {
        Text = text;
        CpfDigits = cpfDigits;
        Status = status;
    }

    public string? Text { get; }

    public string? CpfDigits { get; }

    public ClientStatus? Status { get; }

    public static ClientListFilter Create(int page, int pageSize, SearchText? search, ClientStatus? status)
    {
        var text = TextOf(search);

        return new ClientListFilter(page, pageSize, text, ExtractCpfDigits(text), status);
    }

    private static string? TextOf(SearchText? search)
    {
        if (search is null || search.IsEmpty)
        {
            return null;
        }

        return search.Value;
    }

    private static string? ExtractCpfDigits(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var digits = new string(text.Where(character => character is not ('.' or '-') && !char.IsWhiteSpace(character)).ToArray());
        if (digits.Length == 0 || !digits.All(char.IsAsciiDigit))
        {
            return null;
        }

        return digits;
    }
}
