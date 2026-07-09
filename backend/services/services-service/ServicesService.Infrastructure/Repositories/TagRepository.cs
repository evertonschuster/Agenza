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

    public async Task AddAsync(Tag tag, CancellationToken cancellationToken)
    {
        await _dbContext.Tags.AddAsync(tag, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(Tag tag, CancellationToken cancellationToken)
    {
        _dbContext.Tags.Remove(tag);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
