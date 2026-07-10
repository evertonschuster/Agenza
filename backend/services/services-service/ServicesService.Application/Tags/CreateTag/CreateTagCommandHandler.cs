using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;
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
        Tag tag;
        try
        {
            var color = TagColor.From(command.Color);
            tag = new Tag(IdGenerator.NewId(), command.TenantId, command.Name, color, command.Description);
        }
        catch (InvalidTagException exception)
        {
            // Reached only if a caller bypasses CreateTagCommandValidator -
            // the validator already rejects malformed shape before this
            // handler runs. Domain stays exception-based (zero deps, see
            // docs/adr/0005); the Application boundary still never lets
            // one escape as an exception.
            return Result.Failure<TagResponse>(Error.Validation("Tag.Invalid", exception.Message));
        }

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
