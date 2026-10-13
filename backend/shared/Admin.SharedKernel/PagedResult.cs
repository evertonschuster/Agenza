namespace Admin.SharedKernel;

public sealed record PagedResult<TItem>(IReadOnlyList<TItem> Items, int TotalCount, int Page, int PageSize)
{
    public PagedResult<TOutput> Map<TOutput>(Func<TItem, TOutput> map)
    {
        return new PagedResult<TOutput>(Items.Select(map).ToList(), TotalCount, Page, PageSize);
    }
}
