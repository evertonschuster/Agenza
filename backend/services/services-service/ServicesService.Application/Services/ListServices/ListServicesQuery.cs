using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(
    string? Search = null,
    Guid? CategoryId = null,
    Guid? TagId = null) : PagedQuery, IQuery<PagedResult<ServiceResponse>>
{
    public ServiceListFilter ToFilter()
    {
        return new ServiceListFilter(Page, PageSize, SearchOf(Search), CategoryId, TagId);
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
