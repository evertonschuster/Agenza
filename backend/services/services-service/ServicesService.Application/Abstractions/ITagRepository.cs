using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

/// <summary>
/// Port for Tag persistence. Every method takes the tenant id explicitly
/// (repo non-negotiable): a Tag can only ever be read or written inside
/// the tenant it belongs to. AddAsync/RemoveAsync only stage the change -
/// call IUnitOfWork.SaveChangesAsync to commit (see its doc comment).
/// </summary>
public interface ITagRepository
{
    /// <summary>Tenant's tags ordered by name (asc) - the API contract's order.</summary>
    Task<IReadOnlyList<Tag>> ListAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<Tag?> GetByIdAsync(Guid tenantId, Guid tagId, CancellationToken cancellationToken);

    /// <summary>
    /// Case-insensitive name uniqueness check within the tenant.
    /// <paramref name="excludeTagId"/> ignores one tag (the one being
    /// renamed) so updating a tag without changing its name is not a
    /// self-conflict.
    /// </summary>
    Task<bool> NameExistsAsync(Guid tenantId, string name, Guid? excludeTagId, CancellationToken cancellationToken);

    void Add(Tag tag);

    void Remove(Tag tag);
}
