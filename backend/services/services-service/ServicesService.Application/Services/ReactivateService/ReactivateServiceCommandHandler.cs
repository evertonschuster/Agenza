using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.ReactivateService;

public sealed class ReactivateServiceCommandHandler(
    IServiceRepository serviceRepository,
    IUnitOfWork unitOfWork,
    ILogger<ReactivateServiceCommandHandler> logger) : ICommandHandler<ReactivateServiceCommand>
{
    public async Task<Result> Handle(ReactivateServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        var reactivateResult = service.Reactivate();
        if (reactivateResult.IsFailure)
        {
            return Result.Failure(reactivateResult.Error.ToApplicationError());
        }

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            logger.LogWarning(
                "Reactivating a service failed with {Kind} on {ConstraintName}",
                saveResult.Error.Kind,
                saveResult.Error.ConstraintName);

            return Result.Failure(Error.Conflict(
                "Service.SaveFailed",
                "Não foi possível salvar o serviço. Tente novamente."));
        }

        return Result.Success();
    }
}
