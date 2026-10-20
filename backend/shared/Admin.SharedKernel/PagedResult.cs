namespace Admin.SharedKernel;

public sealed record PagedResult<TItem>(IReadOnlyList<TItem> Items, int TotalCount, int Page, int PageSize)
{
    public PagedResult<TOutput> Map<TOutput>(Func<TItem, TOutput> map)
    {
        var mappedItems = Items.Select(map);
        var items = mappedItems.ToList();

        return new PagedResult<TOutput>(items, TotalCount, Page, PageSize);
    }
}
