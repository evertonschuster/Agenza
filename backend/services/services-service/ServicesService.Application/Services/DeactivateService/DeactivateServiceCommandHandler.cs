using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.DeactivateService;

public sealed class DeactivateServiceCommandHandler : ICommandHandler<DeactivateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeactivateServiceCommandHandler(
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork)
    {
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceResponse>> Handle(DeactivateServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await _serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure<ServiceResponse>(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        if (service.Status == ServiceStatus.Inactive)
        {
            return ServiceResponse.FromService(service, service.Category?.Name);
        }

        var transitionResult = service.Inactivate();
        if (transitionResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(transitionResult.Error.ToApplicationError());
        }

        await _serviceRepository.UpdateAsync(service, cancellationToken);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(Error.Conflict(
                "Service.SaveFailed",
                "Não foi possível salvar o serviço. Tente novamente."));
        }

        return ServiceResponse.FromService(service, service.Category?.Name);
    }
}
