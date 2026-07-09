using ServicesService.Application.Abstractions;
using ServicesService.Application.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.UseCases.UpdateTag;

public class UpdateTagUseCase
{
    private readonly ITagRepository _tagRepository;

    public UpdateTagUseCase(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<TagResult> ExecuteAsync(
        UpdateTagRequest request,
        CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(request.TenantId, request.TagId, cancellationToken)
            ?? throw new TagNotFoundException(request.TagId);

        var newName = request.Name?.Trim() ?? string.Empty;
        if (await _tagRepository.NameExistsAsync(request.TenantId, newName, excludeTagId: tag.Id, cancellationToken))
        {
            throw new DuplicateTagNameException(newName);
        }

        tag.Update(newName, TagColor.From(request.Color), request.Description);
        await _tagRepository.SaveChangesAsync(cancellationToken);

        return TagResult.FromTag(tag);
    }
}
