namespace ServicesService.Application.Services.ListServices;

public static class ListServicesQueryExtensions
{
    public static ServiceListFilter ToFilter(this ListServicesQuery query)
    {
        return ServiceListFilter.Create(query.Page, query.PageSize, query.Search, query.CategoryId, query.TagId);
    }
}
