using Admin.SharedKernel;
using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class TagRepository : RepositoryBase<Tag>, ITagRepository
{
    public TagRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<PagedResult<Tag>> ListAsync(TagListFilter filter, CancellationToken cancellationToken)
    {
        var filterAndOrder = (IQueryable<Tag> query) => FilterAndOrder(query, filter);

        return ListPagedAsync(filter, filterAndOrder, cancellationToken);
    }

    private static IOrderedQueryable<Tag> FilterAndOrder(IQueryable<Tag> query, TagListFilter filter)
    {
        if (filter.Text is { } text)
        {
            query = query.Where(tag => EF.Property<string>(tag, "NameNormalized").Contains(text));
        }

        var tagsByName = query.OrderBy(tag => tag.Name);

        return tagsByName.ThenBy(tag => tag.Id);
    }

    public Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken) =>
        FindAsync(t => t.Id == tagId, cancellationToken);

    public Task<Tag?> GetForUpdateAsync(Guid tagId, CancellationToken cancellationToken) =>
        FindForUpdateAsync(t => t.Id == tagId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeTagId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return AnyAsync(
            t => EF.Property<string>(t, "NameNormalized") == normalized
                && (excludeTagId == null || t.Id != excludeTagId),
            cancellationToken);
    }

    public async Task<IReadOnlyList<Tag>> GetByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken)
    {
        if (tagIds.Count == 0)
        {
            return [];
        }

        return await ListAsync(t => tagIds.Contains(t.Id), order: null, cancellationToken);
    }
}
