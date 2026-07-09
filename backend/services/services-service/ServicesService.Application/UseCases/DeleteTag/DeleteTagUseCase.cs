using ServicesService.Application.Abstractions;
using ServicesService.Application.Exceptions;

namespace ServicesService.Application.UseCases.DeleteTag;

public class DeleteTagUseCase
{
    private readonly ITagRepository _tagRepository;

    public DeleteTagUseCase(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task ExecuteAsync(DeleteTagRequest request, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(request.TenantId, request.TagId, cancellationToken)
            ?? throw new TagNotFoundException(request.TagId);

        await _tagRepository.RemoveAsync(tag, cancellationToken);
    }
}
