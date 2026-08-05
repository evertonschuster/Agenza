using IdentityService.Domain.Entities;

namespace IdentityService.Application.Abstractions;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, CancellationToken cancellationToken);

    // Returns false instead of throwing when a concurrent request already committed the same tenant name.
    Task<bool> AddAsync(Tenant tenant, CancellationToken cancellationToken);
}
