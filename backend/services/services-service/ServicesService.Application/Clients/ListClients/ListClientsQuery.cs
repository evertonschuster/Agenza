using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    SearchText? Search = null,
    ClientStatusFilter? Status = ClientStatusFilter.Active) : PagedQuery, IQuery<PagedResult<ClientListItemResponse>>
{
    public ClientListFilter ToFilter()
    {
        var text = Search?.Value;
        var cpfDigits = CpfDigitsOf(text);
        var status = ToClientStatus(Status);

        return new ClientListFilter(Page, PageSize, text, cpfDigits, status);
    }

    private static string? CpfDigitsOf(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var digits = new string(text.Where(character => character is not ('.' or '-') && !char.IsWhiteSpace(character)).ToArray());
        if (digits.Length == 0 || digits.Length > CpfNumber.Length || !digits.All(char.IsAsciiDigit))
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
