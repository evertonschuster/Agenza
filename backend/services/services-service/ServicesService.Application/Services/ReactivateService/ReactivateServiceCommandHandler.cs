using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.ReactivateService;

public sealed class ReactivateServiceCommandHandler : ICommandHandler<ReactivateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ReactivateServiceCommandHandler> _logger;

    public ReactivateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ICategoryRepository categoryRepository,
        IUnitOfWork unitOfWork,
        ILogger<ReactivateServiceCommandHandler> logger)
    {
        _serviceRepository = serviceRepository;
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<ServiceResponse>> Handle(ReactivateServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await _serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure<ServiceResponse>(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        var categoryName = await CategoryNameAsync(service, cancellationToken);

        if (service.Status == ServiceStatus.Active)
        {
            return ServiceResponse.FromService(service, categoryName);
        }

        var transitionResult = service.Reactivate();
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

        return ServiceResponse.FromService(service, categoryName);
    }

    private async Task<string?> CategoryNameAsync(Service service, CancellationToken cancellationToken)
    {
        if (service.CategoryId is not { } categoryId)
        {
            return null;
        }

        var category = await _categoryRepository.GetByIdAsync(categoryId, cancellationToken);
        return category?.Name;
    }
}
