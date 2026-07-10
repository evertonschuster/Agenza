using Admin.SharedKernel.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class TagRepository : RepositoryBase<Tag>, ITagRepository
{
    public TagRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<IReadOnlyList<Tag>> ListAsync(Guid tenantId, CancellationToken cancellationToken) =>
        ListAsync(t => t.TenantId == tenantId, query => query.OrderBy(t => t.Name), cancellationToken);

    public Task<Tag?> GetByIdAsync(Guid tenantId, Guid tagId, CancellationToken cancellationToken) =>
        FindAsync(t => t.TenantId == tenantId && t.Id == tagId, cancellationToken);

    public Task<bool> NameExistsAsync(
        Guid tenantId,
        string name,
        Guid? excludeTagId,
        CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();

        // t.Name.ToLower() translates to Postgres lower(), so the
        // case-insensitive uniqueness rule is evaluated in the database.
        return AnyAsync(
            t => t.TenantId == tenantId
                && t.Name.ToLower() == normalized
                && (excludeTagId == null || t.Id != excludeTagId),
            cancellationToken);
    }
}
