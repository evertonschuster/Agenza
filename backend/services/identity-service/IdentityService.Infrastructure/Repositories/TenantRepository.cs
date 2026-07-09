using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;
using IdentityService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Infrastructure.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly IdentityDataContext _dbContext;

    public TenantRepository(IdentityDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return await _dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
    }

    public async Task AddAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        await _dbContext.Tenants.AddAsync(tenant, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
