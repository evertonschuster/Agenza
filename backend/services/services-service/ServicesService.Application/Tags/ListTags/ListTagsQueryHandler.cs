using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.ListTags;

public sealed class ListTagsQueryHandler : IQueryHandler<ListTagsQuery, PagedResult<TagResponse>>
{
    private readonly ITagRepository _tagRepository;

    public ListTagsQueryHandler(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<Result<PagedResult<TagResponse>>> Handle(
        ListTagsQuery query,
        CancellationToken cancellationToken)
    {
        var tagFilter = query.ToFilter();
        var tags = await _tagRepository.ListAsync(tagFilter, cancellationToken);
        var responseTags = tags.Map(TagResponse.FromTag);

        return Result.Success(responseTags);
    }
}
