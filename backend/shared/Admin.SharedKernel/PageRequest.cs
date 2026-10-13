namespace Admin.SharedKernel;

public record PageRequest
{
    public const int FirstPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public const string PageInvalidCode = "Paging.PageInvalid";
    public const string PageSizeInvalidCode = "Paging.PageSizeInvalid";
    public const string PageTooLargeCode = "Paging.PageTooLarge";

    public PageRequest(int page, int pageSize)
    {
        if (page < FirstPage)
        {
            throw new ArgumentOutOfRangeException(nameof(page), page, $"The page must be at least {FirstPage}.");
        }

        if (pageSize < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(pageSize), pageSize, "The page size must be at least 1.");
        }

        if (!OffsetFits(page, pageSize))
        {
            throw new ArgumentOutOfRangeException(nameof(page), page, "The offset of the page does not fit an int.");
        }

        Page = page;
        PageSize = pageSize;
    }

    public int Page { get; }

    public int PageSize { get; }

    public int Offset => (Page - 1) * PageSize;

    public static bool OffsetFits(int page, int pageSize)
    {
        return (long)(page - 1) * pageSize <= int.MaxValue;
    }
}
