using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.ListTags;

public sealed class ListTagsQueryHandler : IQueryHandler<ListTagsQuery, IReadOnlyList<TagResponse>>
{
    private readonly ITagRepository _tagRepository;

    public ListTagsQueryHandler(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<Result<IReadOnlyList<TagResponse>>> Handle(
        ListTagsQuery query,
        CancellationToken cancellationToken)
    {
        var tags = await _tagRepository.ListAsync(query.Search, cancellationToken);
        IReadOnlyList<TagResponse> response = tags.Select(TagResponse.FromTag).ToList();

        return Result.Success(response);
    }
}
