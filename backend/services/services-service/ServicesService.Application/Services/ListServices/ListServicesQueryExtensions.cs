namespace ServicesService.Application.Services.ListServices;

public static class ListServicesQueryExtensions
{
    public static ServiceListFilter ToFilter(this ListServicesQuery query)
    {
        return new ServiceListFilter(query.Page, query.PageSize, SearchOf(query.Search), query.CategoryId, query.TagId);
    }

    private static string? SearchOf(string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return null;
        }

        return search.Trim();
    }
}
