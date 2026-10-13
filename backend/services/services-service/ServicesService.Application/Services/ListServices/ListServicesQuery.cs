using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(
    SearchText? Search = null,
    Guid? CategoryId = null,
    Guid? TagId = null) : PagedQuery, IQuery<PagedResult<ServiceResponse>>
{
    public ServiceListFilter ToFilter()
    {
        return new ServiceListFilter(Page, PageSize, Search?.Value, CategoryId, TagId);
    }
}
