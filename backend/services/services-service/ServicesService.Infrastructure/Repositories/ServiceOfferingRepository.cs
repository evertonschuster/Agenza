using Admin.SharedKernel.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ServiceOfferingRepository : RepositoryBase<ServiceOffering>, IServiceOfferingRepository
{
    public ServiceOfferingRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<IReadOnlyList<ServiceOffering>> ListAsync(CancellationToken cancellationToken) =>
        ListAsync(query => query.OrderBy(s => s.Name), cancellationToken);

    public Task<ServiceOffering?> GetByIdAsync(Guid serviceOfferingId, CancellationToken cancellationToken) =>
        FindAsync(s => s.Id == serviceOfferingId, cancellationToken);

    public Task<bool> NameExistsAsync(
        string name, Guid? excludeServiceOfferingId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        return AnyAsync(
            s => s.Name.ToLower() == normalized
                && (excludeServiceOfferingId == null || s.Id != excludeServiceOfferingId),
            cancellationToken);
    }
}
