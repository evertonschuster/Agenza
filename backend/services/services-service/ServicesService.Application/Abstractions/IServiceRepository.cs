using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface IServiceRepository
{
    Task<(IReadOnlyList<Service> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? search,
        Guid? categoryId,
        IReadOnlyCollection<Guid> tagIds,
        ServiceStatus? status,
        CancellationToken cancellationToken);

    Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken);

    Task<Service?> FindByNameAsync(string name, CancellationToken cancellationToken);

    Task<int> CountByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken);

    Task<int> CountByTagIdAsync(Guid tagId, CancellationToken cancellationToken);

    void Add(Service service);

    void Remove(Service service);
}
