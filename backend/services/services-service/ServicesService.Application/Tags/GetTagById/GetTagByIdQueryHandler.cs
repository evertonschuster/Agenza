using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.GetTagById;

public sealed class GetTagByIdQueryHandler : IQueryHandler<GetTagByIdQuery, TagResponse>
{
    private readonly ITagRepository _tagRepository;

    public GetTagByIdQueryHandler(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<Result<TagResponse>> Handle(GetTagByIdQuery query, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(query.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure<TagResponse>(
                Error.NotFound("Tag.NotFound", $"Etiqueta '{query.TagId}' não foi encontrada."));
        }

        return TagResponse.FromTag(tag);
    }
}
