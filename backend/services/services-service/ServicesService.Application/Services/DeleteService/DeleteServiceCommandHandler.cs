using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.DeleteService;

public sealed class DeleteServiceCommandHandler(
    IServiceRepository serviceRepository,
    IUnitOfWork unitOfWork,
    ILogger<DeleteServiceCommandHandler> logger) : ICommandHandler<DeleteServiceCommand>
{
    public async Task<Result> Handle(DeleteServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        serviceRepository.Remove(service);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            logger.LogWarning(
                "Deleting a service failed with {Kind} on {ConstraintName}",
                saveResult.Error.Kind,
                saveResult.Error.ConstraintName);

            return Result.Failure(Error.Conflict(
                "Service.SaveFailed",
                "Não foi possível salvar o serviço. Tente novamente."));
        }

        return Result.Success();
    }
}
