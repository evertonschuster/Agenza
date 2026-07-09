using ServicesService.Application.Abstractions;
using ServicesService.Application.Exceptions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.UseCases.CreateTag;

public class CreateTagUseCase
{
    private readonly ITagRepository _tagRepository;

    public CreateTagUseCase(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<TagResult> ExecuteAsync(
        CreateTagRequest request,
        CancellationToken cancellationToken)
    {
        // Construct first: the entity validates name/color/description and
        // normalizes (trims) the name, so the uniqueness check below runs
        // against the same value that would be persisted.
        var tag = new Tag(
            Guid.NewGuid(),
            request.TenantId,
            request.Name,
            TagColor.From(request.Color),
            request.Description);

        if (await _tagRepository.NameExistsAsync(request.TenantId, tag.Name, excludeTagId: null, cancellationToken))
        {
            throw new DuplicateTagNameException(tag.Name);
        }

        await _tagRepository.AddAsync(tag, cancellationToken);

        return TagResult.FromTag(tag);
    }
}
