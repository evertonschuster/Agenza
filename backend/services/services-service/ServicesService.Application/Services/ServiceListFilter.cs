using Admin.SharedKernel;

namespace ServicesService.Application.Services;

public sealed record ServiceListFilter : PageRequest
{
    private ServiceListFilter(int page, int pageSize, string? search, Guid? categoryId, Guid? tagId)
        : base(page, pageSize)
    {
        Search = search;
        CategoryId = categoryId;
        TagId = tagId;
    }

    public string? Search { get; }

    public Guid? CategoryId { get; }

    public Guid? TagId { get; }

    public static ServiceListFilter Create(int page, int pageSize, string? search, Guid? categoryId, Guid? tagId)
    {
        return new ServiceListFilter(page, pageSize, SearchOf(search), categoryId, tagId);
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
