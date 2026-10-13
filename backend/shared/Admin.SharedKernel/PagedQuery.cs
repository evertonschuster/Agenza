namespace Admin.SharedKernel;

public abstract record PagedQuery
{
    public int Page { get; init; } = PageRequest.FirstPage;

    public int PageSize { get; init; } = PageRequest.DefaultPageSize;
}
