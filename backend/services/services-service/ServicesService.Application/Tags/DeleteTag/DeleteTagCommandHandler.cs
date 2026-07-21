using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandHandler : ICommandHandler<DeleteTagCommand>
{
    private readonly ITagRepository _tagRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteTagCommandHandler> _logger;

    public DeleteTagCommandHandler(
        ITagRepository tagRepository,
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork,
        ILogger<DeleteTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure(
                Error.NotFound("Tag.NotFound", $"Etiqueta '{command.TagId}' não foi encontrada."));
        }

        var usageCount = await _serviceRepository.CountByTagIdAsync(command.TagId, cancellationToken);
        if (usageCount > 0)
        {
            return Result.Failure(
                Error.Conflict(
                    "Tag.InUse",
                    $"Esta etiqueta está em uso por {usageCount} serviço(s) e não pode ser excluída."));
        }

        _tagRepository.Remove(tag);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure(TagPersistenceErrorMapper.Map(saveResult.Error, tag.Name, _logger));
        }

        return Result.Success();
    }
}
