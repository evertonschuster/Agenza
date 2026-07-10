using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.ServiceOfferings.CreateServiceOffering;

public sealed class CreateServiceOfferingCommandHandler
    : ICommandHandler<CreateServiceOfferingCommand, ServiceOfferingResponse>
{
    private readonly IServiceOfferingRepository _serviceOfferingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateServiceOfferingCommandHandler(
        IServiceOfferingRepository serviceOfferingRepository,
        IUnitOfWork unitOfWork)
    {
        _serviceOfferingRepository = serviceOfferingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceOfferingResponse>> Handle(
        CreateServiceOfferingCommand command,
        CancellationToken cancellationToken)
    {
        var serviceOffering = command.ToModel();

        if (await _serviceOfferingRepository.NameExistsAsync(
                serviceOffering.Name, excludeServiceOfferingId: null, cancellationToken))
        {
            return Result.Failure<ServiceOfferingResponse>(
                Error.Conflict(
                    "ServiceOffering.DuplicateName",
                    $"A service offering named '{serviceOffering.Name}' already exists."));
        }

        _serviceOfferingRepository.Add(serviceOffering);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ServiceOfferingResponse.FromServiceOffering(serviceOffering);
    }
}
