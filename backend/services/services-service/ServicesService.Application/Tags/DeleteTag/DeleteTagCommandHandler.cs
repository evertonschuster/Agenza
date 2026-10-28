using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandHandler : ICommandHandler<DeleteTagCommand>
{
    private readonly ITagRepository _tagRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IClientRepository _clientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteTagCommandHandler> _logger;

    public DeleteTagCommandHandler(
        ITagRepository tagRepository,
        IServiceRepository serviceRepository,
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ILogger<DeleteTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _serviceRepository = serviceRepository;
        _clientRepository = clientRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetForUpdateAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure(
                Error.NotFound("Tag.NotFound", $"Etiqueta '{command.TagId}' não foi encontrada."));
        }

        var serviceCount = await _serviceRepository.CountByTagIdAsync(command.TagId, cancellationToken);
        var clientCount = await _clientRepository.CountByTagIdAsync(command.TagId, cancellationToken);
        if (serviceCount + clientCount > 0)
        {
            return Result.Failure(Error.Conflict("Tag.InUse", InUseMessage(serviceCount, clientCount)));
        }

        _tagRepository.Remove(tag);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure(TagPersistenceErrorMapper.Map(saveResult.Error, tag.Name, _logger));
        }

        return Result.Success();
    }

    private static string InUseMessage(int serviceCount, int clientCount)
    {
        if (clientCount == 0)
        {
            return $"Esta etiqueta está em uso por {serviceCount} serviço(s) e não pode ser excluída.";
        }

        if (serviceCount == 0)
        {
            return $"Esta etiqueta está em uso por {clientCount} pessoa(s) e não pode ser excluída.";
        }

        return $"Esta etiqueta está em uso por {serviceCount} serviço(s) e {clientCount} pessoa(s) e não pode ser excluída.";
    }
}
