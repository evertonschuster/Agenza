using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class TagRepository : ITagRepository
{
    private readonly ServicesDataContext _dbContext;

    public TagRepository(ServicesDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Tag>> ListAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return await _dbContext.Tags
            .Where(t => t.TenantId == tenantId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Tag?> GetByIdAsync(Guid tenantId, Guid tagId, CancellationToken cancellationToken)
    {
        return await _dbContext.Tags
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == tagId, cancellationToken);
    }

    public async Task<bool> NameExistsAsync(
        Guid tenantId,
        string name,
        Guid? excludeTagId,
        CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();

        // t.Name.ToLower() translates to Postgres lower(), so the
        // case-insensitive uniqueness rule is evaluated in the database.
        return await _dbContext.Tags.AnyAsync(
            t => t.TenantId == tenantId
                && t.Name.ToLower() == normalized
                && (excludeTagId == null || t.Id != excludeTagId),
            cancellationToken);
    }

    // Add/Remove only stage the change on the tracked DbContext - they
    // don't call SaveChangesAsync themselves. The command handler commits
    // explicitly via IUnitOfWork, so the commit boundary is the handler's
    // decision, not the repository's.
    public void Add(Tag tag) => _dbContext.Tags.Add(tag);

    public void Remove(Tag tag) => _dbContext.Tags.Remove(tag);
}
