using Admin.SharedKernel;

namespace ServicesService.Application.Tags;

public sealed record TagListFilter(int Page, int PageSize, string? Text) : PageRequest(Page, PageSize);
