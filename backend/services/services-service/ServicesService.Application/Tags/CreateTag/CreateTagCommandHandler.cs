using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

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
        var tag = command.ToModel();

        if (await _tagRepository.NameExistsAsync(tag.Name, excludeTagId: null, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{tag.Name}'."));
        }

        _tagRepository.Add(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return TagResponse.FromTag(tag);
    }
}
