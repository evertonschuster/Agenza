using Admin.SharedKernel;

namespace ServicesService.Application.Services;

public sealed record ServiceListFilter(
    int Page,
    int PageSize,
    string? Search,
    Guid? CategoryId,
    Guid? TagId) : PageRequest(Page, PageSize);
