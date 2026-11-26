using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.DeactivateService;

public sealed class DeactivateServiceCommandHandler : ICommandHandler<DeactivateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeactivateServiceCommandHandler> _logger;

    public DeactivateServiceCommandHandler(
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork,
        ILogger<DeactivateServiceCommandHandler> logger)
    {
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
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
            return Result.Failure<ServiceResponse>(
                ServicePersistenceErrorMapper.Map(saveResult.Error, service.Name, _logger));
        }

        return ServiceResponse.FromService(service, service.Category?.Name);
    }
}
