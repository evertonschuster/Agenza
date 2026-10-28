using Admin.SharedKernel;
using ServicesService.Application.Services;
using ServicesService.Application.Tags;

namespace ServicesService.Application.Abstractions;

public interface IServiceRepository
{
    Task<PagedResult<Service>> ListAsync(ServiceListFilter filter, CancellationToken cancellationToken);

    Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken);

    Task UpdateAsync(Service service, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, Guid? excludeServiceId, CancellationToken cancellationToken);

    Task<int> CountByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken);

    Task<int> CountByTagIdAsync(Guid tagId, CancellationToken cancellationToken);

    Task<IReadOnlyList<TagUsage>> ListByTagIdAsync(Guid tagId, int limit, CancellationToken cancellationToken);

    void Add(Service service);

    void Remove(Service service);
}
