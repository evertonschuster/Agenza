using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed class UpdateTagCommandHandler : ICommandHandler<UpdateTagCommand, TagResponse>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateTagCommandHandler> _logger;

    public UpdateTagCommandHandler(
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork,
        ILogger<UpdateTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<TagResponse>> Handle(UpdateTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure<TagResponse>(
                Error.NotFound("Tag.NotFound", $"Etiqueta '{command.TagId}' não foi encontrada."));
        }

        if (await _tagRepository.NameExistsAsync(command.Name, command.TagId, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{command.Name}'."));
        }

        var applyResult = command.ApplyTo(tag);
        if (applyResult.IsFailure)
        {
            return Result.Failure<TagResponse>(applyResult.Error.ToApplicationError());
        }

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<TagResponse>(TagPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return TagResponse.FromTag(tag);
    }
}
