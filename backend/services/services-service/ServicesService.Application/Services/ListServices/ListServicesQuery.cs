using Admin.SharedKernel;

namespace ServicesService.Application.Services.ListServices;

public sealed record ListServicesQuery(int Page = 1, int PageSize = 20) : IQuery<PagedResult<ServiceResponse>>;
