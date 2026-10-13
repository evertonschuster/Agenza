using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    SearchText? Search = null,
    ClientStatusFilter? Status = ClientStatusFilter.Active) : PagedQuery, IQuery<PagedResult<ClientListItemResponse>>
{
    public ClientListFilter ToFilter()
    {
        var text = TextOf(Search);
        var cpfDigits = CpfDigits.Create(text);
        var status = ToClientStatus(Status);

        return new ClientListFilter(Page, PageSize, text, cpfDigits, status);
    }

    private static string? TextOf(SearchText? search)
    {
        if (search is null || search.IsEmpty)
        {
            return null;
        }

        return search.Value;
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
