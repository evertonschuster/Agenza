using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? CategoryId = null,
    IReadOnlyList<Guid>? TagIds = null,
    string? Status = null) : IQuery<PagedResult<ServiceResponse>>;
