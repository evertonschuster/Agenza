namespace Admin.SharedKernel;

public sealed record PagedResult<TItem>(IReadOnlyList<TItem> Items, int TotalCount, int Page, int PageSize)
{
    public PagedResult<TOutput> Map<TOutput>(Func<TItem, TOutput> map)
    {
        var mappedItems = Items.Select(map).ToList();

        return new PagedResult<TOutput>(mappedItems, TotalCount, Page, PageSize);
    }
}
