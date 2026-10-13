using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(
    string? Search = null,
    Guid? CategoryId = null,
    Guid? TagId = null) : PagedQuery, IQuery<PagedResult<ServiceResponse>>;
