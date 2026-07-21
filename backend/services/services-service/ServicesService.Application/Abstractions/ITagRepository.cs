using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface ITagRepository
{
    Task<IReadOnlyList<Tag>> ListAsync(string? search, CancellationToken cancellationToken);

    Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken);

    // excludeTagId ignores the tag being renamed, so updating a tag without changing its name isn't a self-conflict.
    Task<bool> NameExistsAsync(string name, Guid? excludeTagId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> GetByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken);

    void Add(Tag tag);

    void Remove(Tag tag);
}
