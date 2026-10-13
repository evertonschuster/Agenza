using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(
    SearchText? Search = null,
    Guid? CategoryId = null,
    Guid? TagId = null) : PagedQuery, IQuery<PagedResult<ServiceResponse>>
{
    public ServiceListFilter ToFilter()
    {
        return new ServiceListFilter(Page, PageSize, TextOf(Search), CategoryId, TagId);
    }

    private static string? TextOf(SearchText? search)
    {
        if (search is null || search.IsEmpty)
        {
            return null;
        }

        return search.Value;
    }
}
