using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.TestDoubles;

/// <summary>
/// Hand-written in-memory ITagRepository for use case tests (repo
/// convention: fakes over mocking libraries). Filters by tenant exactly
/// like the real repository so tenant pass-through is actually exercised.
/// </summary>
public class FakeTagRepository : ITagRepository
{
    public List<Tag> Tags { get; } = [];
    public int SaveChangesCalls { get; private set; }

    public Task<IReadOnlyList<Tag>> ListAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        IReadOnlyList<Tag> result = Tags
            .Where(t => t.TenantId == tenantId)
            .OrderBy(t => t.Name, StringComparer.Ordinal)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<Tag?> GetByIdAsync(Guid tenantId, Guid tagId, CancellationToken cancellationToken)
    {
        return Task.FromResult(Tags.FirstOrDefault(t => t.TenantId == tenantId && t.Id == tagId));
    }

    public Task<bool> NameExistsAsync(
        Guid tenantId,
        string name,
        Guid? excludeTagId,
        CancellationToken cancellationToken)
    {
        var exists = Tags.Any(t =>
            t.TenantId == tenantId
            && string.Equals(t.Name, name.Trim(), StringComparison.OrdinalIgnoreCase)
            && (excludeTagId is null || t.Id != excludeTagId));

        return Task.FromResult(exists);
    }

    public Task AddAsync(Tag tag, CancellationToken cancellationToken)
    {
        Tags.Add(tag);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Tag tag, CancellationToken cancellationToken)
    {
        Tags.Remove(tag);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        SaveChangesCalls++;
        return Task.CompletedTask;
    }
}
