using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ServiceRepository : RepositoryBase<Service>, IServiceRepository
{
    public ServiceRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<(IReadOnlyList<Service> Items, int TotalCount)> ListAsync(int page, int pageSize, CancellationToken cancellationToken) =>
        ListPagedAsync(query => query.Include(s => s.Tags).OrderBy(s => s.Name), page, pageSize, cancellationToken);

    public Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken) =>
        Set.Include(s => s.Tags).FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeServiceId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        return AnyAsync(
            s => s.Name.ToLower() == normalized && (excludeServiceId == null || s.Id != excludeServiceId),
            cancellationToken);
    }
}
