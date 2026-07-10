using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

public sealed class UpdateServiceOfferingCommandHandler
    : ICommandHandler<UpdateServiceOfferingCommand, ServiceOfferingResponse>
{
    private readonly IServiceOfferingRepository _serviceOfferingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateServiceOfferingCommandHandler(
        IServiceOfferingRepository serviceOfferingRepository,
        IUnitOfWork unitOfWork)
    {
        _serviceOfferingRepository = serviceOfferingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceOfferingResponse>> Handle(
        UpdateServiceOfferingCommand command,
        CancellationToken cancellationToken)
    {
        var serviceOffering = await _serviceOfferingRepository.GetByIdAsync(
            command.ServiceOfferingId, cancellationToken);
        if (serviceOffering is null)
        {
            return Result.Failure<ServiceOfferingResponse>(
                Error.NotFound(
                    "ServiceOffering.NotFound",
                    $"Service offering '{command.ServiceOfferingId}' was not found."));
        }

        var newName = command.Name.Trim();
        if (await _serviceOfferingRepository.NameExistsAsync(newName, serviceOffering.Id, cancellationToken))
        {
            return Result.Failure<ServiceOfferingResponse>(
                Error.Conflict(
                    "ServiceOffering.DuplicateName",
                    $"A service offering named '{newName}' already exists."));
        }

        command.ApplyTo(serviceOffering);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ServiceOfferingResponse.FromServiceOffering(serviceOffering);
    }
}
