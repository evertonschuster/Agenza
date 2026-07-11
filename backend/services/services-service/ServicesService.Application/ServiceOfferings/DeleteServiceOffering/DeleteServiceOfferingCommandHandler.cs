using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.ServiceOfferings.DeleteServiceOffering;

public sealed class DeleteServiceOfferingCommandHandler : ICommandHandler<DeleteServiceOfferingCommand>
{
    private readonly IServiceOfferingRepository _serviceOfferingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteServiceOfferingCommandHandler(
        IServiceOfferingRepository serviceOfferingRepository,
        IUnitOfWork unitOfWork)
    {
        _serviceOfferingRepository = serviceOfferingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteServiceOfferingCommand command, CancellationToken cancellationToken)
    {
        var serviceOffering = await _serviceOfferingRepository.GetByIdAsync(
            command.ServiceOfferingId, cancellationToken);
        if (serviceOffering is null)
        {
            return Result.Failure(
                Error.NotFound(
                    "ServiceOffering.NotFound",
                    $"Serviço '{command.ServiceOfferingId}' não foi encontrado."));
        }

        _serviceOfferingRepository.Remove(serviceOffering);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
