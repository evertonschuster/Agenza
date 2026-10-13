namespace ServicesService.Application.Clients.ListClients;

public static class ListClientsQueryExtensions
{
    public static ClientListFilter ToFilter(this ListClientsQuery query)
    {
        return ClientListFilter.Create(query.Page, query.PageSize, query.Search, ToClientStatus(query.Status));
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
