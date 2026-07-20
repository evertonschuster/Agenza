using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface IServiceRepository
{
    Task<(IReadOnlyList<Service> Items, int TotalCount)> ListAsync(int page, int pageSize, CancellationToken cancellationToken);

    Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, Guid? excludeServiceId, CancellationToken cancellationToken);

    void Add(Service service);

    void Remove(Service service);
}
