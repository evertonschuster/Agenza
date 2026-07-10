using Admin.SharedKernel.EntityFrameworkCore;
using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;
using IdentityService.Infrastructure.Persistence;

namespace IdentityService.Infrastructure.Repositories;

public class TenantRepository : RepositoryBase<Tenant>, ITenantRepository
{
    public TenantRepository(IdentityDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken) =>
        FindAsync(t => t.Id == tenantId, cancellationToken);

    public async Task AddAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        Add(tenant);
        await DbContext.SaveChangesAsync(cancellationToken);
    }
}
