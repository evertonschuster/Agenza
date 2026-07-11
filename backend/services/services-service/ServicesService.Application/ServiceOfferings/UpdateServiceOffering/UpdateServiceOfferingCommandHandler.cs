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
                    $"Serviço '{command.ServiceOfferingId}' não foi encontrado."));
        }

        var newName = command.Name.Trim();
        if (await _serviceOfferingRepository.NameExistsAsync(newName, serviceOffering.Id, cancellationToken))
        {
            return Result.Failure<ServiceOfferingResponse>(
                Error.Conflict(
                    "ServiceOffering.DuplicateName",
                    $"Já existe um serviço chamado '{newName}'."));
        }

        command.ApplyTo(serviceOffering);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ServiceOfferingResponse.FromServiceOffering(serviceOffering);
    }
}
