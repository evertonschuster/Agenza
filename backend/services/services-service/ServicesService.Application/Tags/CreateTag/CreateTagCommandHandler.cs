using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

public sealed class CreateTagCommandHandler : ICommandHandler<CreateTagCommand, TagResponse>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateTagCommandHandler(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<TagResponse>> Handle(CreateTagCommand command, CancellationToken cancellationToken)
    {
        // Domain construction can throw InvalidTagException (a
        // BusinessException) if a caller bypasses CreateTagCommandValidator
        // - the validator already rejects malformed shape before this
        // handler runs in normal operation. Left uncaught on purpose: the
        // Api's global exception handler maps any BusinessException to a
        // 400 Problem Details response, so every handler doesn't need to
        // repeat the same try/catch (docs/adr/0006).
        var color = TagColor.From(command.Color);
        var tag = new Tag(Guid.CreateVersion7(), command.TenantId, command.Name, color, command.Description);

        if (await _tagRepository.NameExistsAsync(command.TenantId, tag.Name, excludeTagId: null, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"A tag named '{tag.Name}' already exists."));
        }

        _tagRepository.Add(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return TagResponse.FromTag(tag);
    }
}
