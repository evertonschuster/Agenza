using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

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
        var tag = await _tagRepository.GetByIdAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure<TagResponse>(
                Error.NotFound("Tag.NotFound", $"Tag '{command.TagId}' was not found."));
        }

        var newName = command.Name.Trim();
        if (await _tagRepository.NameExistsAsync(newName, tag.Id, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"A tag named '{newName}' already exists."));
        }

        command.ApplyTo(tag);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return TagResponse.FromTag(tag);
    }
}
