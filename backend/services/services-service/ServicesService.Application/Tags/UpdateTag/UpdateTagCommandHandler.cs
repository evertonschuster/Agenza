using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed class UpdateTagCommandHandler : ICommandHandler<UpdateTagCommand, TagResponse>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateTagCommandHandler(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<TagResponse>> Handle(UpdateTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(command.TenantId, command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure<TagResponse>(
                Error.NotFound("Tag.NotFound", $"Tag '{command.TagId}' was not found."));
        }

        var newName = command.Name.Trim();
        if (await _tagRepository.NameExistsAsync(command.TenantId, newName, tag.Id, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"A tag named '{newName}' already exists."));
        }

        try
        {
            var color = TagColor.From(command.Color);
            tag.Update(command.Name, color, command.Description);
        }
        catch (InvalidTagException exception)
        {
            return Result.Failure<TagResponse>(Error.Validation("Tag.Invalid", exception.Message));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return TagResponse.FromTag(tag);
    }
}
