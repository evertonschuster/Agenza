using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface IServiceOfferingRepository
{
    Task<IReadOnlyList<ServiceOffering>> ListAsync(CancellationToken cancellationToken);

    Task<ServiceOffering?> GetByIdAsync(Guid serviceOfferingId, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, Guid? excludeServiceOfferingId, CancellationToken cancellationToken);

    void Add(ServiceOffering serviceOffering);

    void Remove(ServiceOffering serviceOffering);
}
