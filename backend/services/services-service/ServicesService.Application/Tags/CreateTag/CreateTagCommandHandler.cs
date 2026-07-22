using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.CreateTag;

public sealed class CreateTagCommandHandler : ICommandHandler<CreateTagCommand, TagResponse>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateTagCommandHandler> _logger;

    public CreateTagCommandHandler(
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<TagResponse>> Handle(CreateTagCommand command, CancellationToken cancellationToken)
    {
        if (await _tagRepository.NameExistsAsync(command.Name, excludeTagId: null, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{command.Name}'."));
        }

        var tagResult = command.ToModel();
        if (tagResult.IsFailure)
        {
            return Result.Failure<TagResponse>(tagResult.Error.ToApplicationError());
        }

        var tag = tagResult.Value;
        _tagRepository.Add(tag);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<TagResponse>(TagPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return TagResponse.FromTag(tag);
    }
}
