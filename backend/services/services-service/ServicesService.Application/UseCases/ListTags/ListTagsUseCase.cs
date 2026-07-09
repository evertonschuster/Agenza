using ServicesService.Application.Abstractions;

namespace ServicesService.Application.UseCases.ListTags;

public class ListTagsUseCase
{
    private readonly ITagRepository _tagRepository;

    public ListTagsUseCase(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<IReadOnlyList<TagResult>> ExecuteAsync(
        ListTagsRequest request,
        CancellationToken cancellationToken)
    {
        var tags = await _tagRepository.ListAsync(request.TenantId, cancellationToken);

        return tags.Select(TagResult.FromTag).ToList();
    }
}
