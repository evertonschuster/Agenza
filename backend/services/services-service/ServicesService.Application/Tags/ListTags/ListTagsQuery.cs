using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery(SearchText? Search = null) : PagedQuery, IQuery<PagedResult<TagResponse>>
{
    public TagListFilter ToFilter()
    {
        return new TagListFilter(Page, PageSize, Search?.Value);
    }
}
