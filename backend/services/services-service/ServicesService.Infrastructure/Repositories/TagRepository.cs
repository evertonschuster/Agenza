using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
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

    public Task<IReadOnlyList<Tag>> ListAsync(string? search, CancellationToken cancellationToken) =>
        ListAsync(
            query => (string.IsNullOrWhiteSpace(search)
                ? query
                : query.Where(t => EF.Functions.ILike(t.Name, $"%{search.Trim()}%")))
                .OrderBy(t => t.Name),
            cancellationToken);

    public Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken) =>
        FindAsync(t => t.Id == tagId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeTagId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return AnyAsync(
            t => EF.Property<string>(t, "NameNormalized") == normalized
                && (excludeTagId == null || t.Id != excludeTagId),
            cancellationToken);
    }

    public Task<IReadOnlyList<Tag>> GetByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken) =>
        ListAsync(t => tagIds.Contains(t.Id), order: null, cancellationToken);
}
