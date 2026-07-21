using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandHandler : ICommandHandler<DeleteTagCommand>
{
    private readonly ITagRepository _tagRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTagCommandHandler(
        ITagRepository tagRepository,
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
