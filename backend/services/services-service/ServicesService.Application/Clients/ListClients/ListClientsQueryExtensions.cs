namespace ServicesService.Application.Clients.ListClients;

public static class ListClientsQueryExtensions
{
    public static ClientListFilter ToFilter(this ListClientsQuery query)
    {
        var text = TextOf(query.Search);

        return new ClientListFilter(query.Page, query.PageSize, text, CpfDigitsOf(text), ToClientStatus(query.Status));
    }

    private static string? TextOf(SearchText? search)
    {
        if (search is null || search.IsEmpty)
        {
            return null;
        }

        return search.Value;
    }

    private static string? CpfDigitsOf(string? text)
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

    private static ClientStatus? ToClientStatus(ClientStatusFilter? status)
    {
        if (status == ClientStatusFilter.All)
        {
            return null;
        }

        if (status == ClientStatusFilter.Inactive)
        {
            return ClientStatus.Inactive;
        }

        return ClientStatus.Active;
    }
}
