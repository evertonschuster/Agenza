using Admin.SharedKernel;

namespace ServicesService.Application.Clients;

public sealed record ClientListFilter(
    int Page,
    int PageSize,
    string? Text,
    string? CpfDigits,
    ClientStatus? Status) : PageRequest(Page, PageSize);
